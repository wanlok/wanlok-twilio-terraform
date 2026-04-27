terraform {
  required_providers {
    twilio = {
      source  = "RJPearson94/twilio"
      version = ">= 0.2.0"
    }
  }
}

provider "twilio" {
  account_sid = var.twilio_account_sid
  auth_token  = var.twilio_auth_token
  api_key     = var.twilio_api_key
  api_secret  = var.twilio_api_secret
}

variable "twilio_account_sid" { type = string }
variable "twilio_auth_token"  { type = string }
variable "twilio_api_key"     { type = string }
variable "twilio_api_secret"  { type = string }
variable "twilio_verify_sid"  { type = string }
variable "auth0_secret"       { type = string }
variable "name"               { type = string }

resource "twilio_serverless_service" "main" {
  friendly_name = var.name
  unique_name   = var.name
}

resource "twilio_serverless_function" "auth0_log_stream" {
  service_sid   = twilio_serverless_service.main.sid
  friendly_name = "auth0_log_stream"
  path          = "/auth0-log-stream"
  visibility    = "public"
  content_type  = "application/javascript"
  source        = "./dist/auth0LogStream.js"
  source_hash   = filemd5("./dist/auth0LogStream.js")
}

resource "twilio_serverless_function" "hello_world" {
  service_sid   = twilio_serverless_service.main.sid
  friendly_name = "hello_world"
  path          = "/hello"
  visibility    = "public"
  content_type  = "application/javascript"
  source        = "./dist/hello.js"
  source_hash   = filemd5("./dist/hello.js")
}

resource "twilio_serverless_environment" "dev" {
  service_sid = twilio_serverless_service.main.sid
  unique_name = "dev"
}

resource "twilio_serverless_variable" "account_sid" {
  service_sid     = twilio_serverless_service.main.sid
  environment_sid = twilio_serverless_environment.dev.sid
  key             = "ACCOUNT_SID"
  value           = var.twilio_account_sid
}

resource "twilio_serverless_variable" "auth_token" {
  service_sid     = twilio_serverless_service.main.sid
  environment_sid = twilio_serverless_environment.dev.sid
  key             = "AUTH_TOKEN"
  value           = var.twilio_auth_token
}

resource "twilio_serverless_variable" "twilio_verify_sid" {
  service_sid     = twilio_serverless_service.main.sid
  environment_sid = twilio_serverless_environment.dev.sid
  key             = "TWILIO_VERIFY_SID"
  value           = var.twilio_verify_sid
}

resource "twilio_serverless_variable" "auth0_secret" {
  service_sid     = twilio_serverless_service.main.sid
  environment_sid = twilio_serverless_environment.dev.sid
  key             = "AUTH0_SECRET"
  value           = var.auth0_secret
}

resource "twilio_serverless_variable" "name" {
  service_sid     = twilio_serverless_service.main.sid
  environment_sid = twilio_serverless_environment.dev.sid
  key             = "name"
  value           = var.name
}

resource "twilio_serverless_build" "deployment_build" {
  service_sid = twilio_serverless_service.main.sid

  function_version {
    sid = twilio_serverless_function.auth0_log_stream.latest_version_sid
  }

  function_version {
    sid = twilio_serverless_function.hello_world.latest_version_sid
  }
}

resource "null_resource" "wait_for_build" {
  depends_on = [twilio_serverless_build.deployment_build]

  triggers = {
    build_sid = twilio_serverless_build.deployment_build.sid
  }

  provisioner "local-exec" {
    command = <<EOF
      while true; do
        STATUS=$(curl -s -X GET "https://serverless.twilio.com/v1/Services/${twilio_serverless_service.main.sid}/Builds/${twilio_serverless_build.deployment_build.sid}" \
          -u "${var.twilio_account_sid}:${var.twilio_auth_token}" | python3 -c "import sys,json; print(json.load(sys.stdin)['status'])")
        echo "Build status: $STATUS"
        if [ "$STATUS" = "completed" ]; then break; fi
        sleep 3
      done
    EOF
  }
}

resource "twilio_serverless_deployment" "dev_deployment" {
  service_sid     = twilio_serverless_service.main.sid
  environment_sid = twilio_serverless_environment.dev.sid
  build_sid       = twilio_serverless_build.deployment_build.sid
  depends_on      = [null_resource.wait_for_build]
}

output "hello_world_url" {
  value = "https://${twilio_serverless_environment.dev.domain_name}${twilio_serverless_function.hello_world.path}"
}

output "auth0_log_stream_url" {
  value = "https://${twilio_serverless_environment.dev.domain_name}${twilio_serverless_function.auth0_log_stream.path}"
}