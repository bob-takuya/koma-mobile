# AWS インフラストラクチャ設定

## API Gateway + Lambda 設定

### Lambda 関数（Node.js）

```javascript
const AWS = require('aws-sdk')
const s3 = new AWS.S3()

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': 'https://bob-takuya.github.io',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,PUT,POST,DELETE,OPTIONS',
  }

  // CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
    }
  }

  try {
    const { pathParameters, httpMethod, body, headers: requestHeaders } = event
    const { projectId, filename } = pathParameters

    // 認証チェック
    const authHeader = requestHeaders.Authorization || requestHeaders.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Unauthorized' }),
      }
    }

    const bucket = process.env.S3_BUCKET_NAME
    const key = `projects/${projectId}/${filename}`

    switch (httpMethod) {
      case 'GET':
        const getResult = await s3.getObject({ Bucket: bucket, Key: key }).promise()
        return {
          statusCode: 200,
          headers: {
            ...headers,
            'Content-Type': getResult.ContentType || 'application/octet-stream',
          },
          body: getResult.Body.toString('base64'),
          isBase64Encoded: true,
        }

      case 'PUT':
        const putParams = {
          Bucket: bucket,
          Key: key,
          Body: Buffer.from(body, 'base64'),
          ContentType: requestHeaders['content-type'] || 'application/octet-stream',
        }
        await s3.putObject(putParams).promise()
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ message: 'Success' }),
        }

      default:
        return {
          statusCode: 405,
          headers,
          body: JSON.stringify({ error: 'Method not allowed' }),
        }
    }
  } catch (error) {
    console.error('Error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' }),
    }
  }
}
```

### CloudFormation テンプレート

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: 'StopMotion Collaborator API'

Parameters:
  BucketName:
    Type: String
    Default: stopmotion-collaborator-bucket

Resources:
  S3Bucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: !Ref BucketName
      CorsConfiguration:
        CorsRules:
          - AllowedHeaders: ['*']
            AllowedMethods: [GET, PUT, POST, DELETE]
            AllowedOrigins:
              - 'https://*.github.io'
              - 'http://localhost:5173'
            ExposedHeaders: [ETag]
            MaxAge: 3600

  LambdaExecutionRole:
    Type: AWS::IAM::Role
    Properties:
      AssumeRolePolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Effect: Allow
            Principal:
              Service: lambda.amazonaws.com
            Action: sts:AssumeRole
      ManagedPolicyArns:
        - arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
      Policies:
        - PolicyName: S3Access
          PolicyDocument:
            Version: '2012-10-17'
            Statement:
              - Effect: Allow
                Action:
                  - s3:GetObject
                  - s3:PutObject
                  - s3:DeleteObject
                Resource: !Sub '${S3Bucket}/projects/*'

  ApiLambda:
    Type: AWS::Lambda::Function
    Properties:
      FunctionName: stopmotion-api
      Runtime: nodejs18.x
      Handler: index.handler
      Role: !GetAtt LambdaExecutionRole.Arn
      Environment:
        Variables:
          S3_BUCKET_NAME: !Ref S3Bucket
      Code:
        ZipFile: |
          // Lambda function code here

  ApiGateway:
    Type: AWS::ApiGateway::RestApi
    Properties:
      Name: stopmotion-api
      EndpointConfiguration:
        Types:
          - REGIONAL

  ProxyResource:
    Type: AWS::ApiGateway::Resource
    Properties:
      RestApiId: !Ref ApiGateway
      ParentId: !GetAtt ApiGateway.RootResourceId
      PathPart: '{proxy+}'

  ProxyMethod:
    Type: AWS::ApiGateway::Method
    Properties:
      RestApiId: !Ref ApiGateway
      ResourceId: !Ref ProxyResource
      HttpMethod: ANY
      AuthorizationType: NONE
      Integration:
        Type: AWS_PROXY
        IntegrationHttpMethod: POST
        Uri: !Sub 'arn:aws:apigateway:${AWS::Region}:lambda:path/2015-03-31/functions/${ApiLambda.Arn}/invocations'

  LambdaPermission:
    Type: AWS::Lambda::Permission
    Properties:
      FunctionName: !Ref ApiLambda
      Action: lambda:InvokeFunction
      Principal: apigateway.amazonaws.com
      SourceArn: !Sub '${ApiGateway}/*/*/*'

  Deployment:
    Type: AWS::ApiGateway::Deployment
    DependsOn: ProxyMethod
    Properties:
      RestApiId: !Ref ApiGateway
      StageName: prod

Outputs:
  ApiUrl:
    Description: API Gateway URL
    Value: !Sub 'https://${ApiGateway}.execute-api.${AWS::Region}.amazonaws.com/prod'

  BucketName:
    Description: S3 Bucket Name
    Value: !Ref S3Bucket
```

### デプロイ手順

1. CloudFormation スタックを作成
2. Lambda 関数コードを更新
3. 環境変数にAPI URLを設定
4. GitHub Pages でアプリをデプロイ

### セキュリティ強化

- API Key による認証
- VPC内でのLambda実行
- CloudFront での配信
- WAF による保護
