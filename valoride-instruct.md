When the Application "Open" button is clicked, call the generate API per the following specification:


/v1/thorapi/generate/{applicationId}

ie:
http://localhost:8080/v1/thorapi/generate/640248c8-7a6f-417d-bf24-70334ac22e52

Generate Stack from Application

Convenience method that looks up an Application by ID and generates the stack using defaults

Parameters
Try it out
Name	Description
applicationId *
string($uuid)
(path)
Unique identifier for the application.


Generate Stack from Application

Convenience method that looks up an Application by ID and generates the stack using defaults

Generates a complete ThorAPI application stack from OpenAPI specification

Parameters
UUID applicationID

curl -X 'POST' \
  'http://localhost:8080/v1/thorapi/generate/640248c8-7a6f-417d-bf24-70334ac22e52' \
  -H 'accept: application/octet-stream' \
  -d ''