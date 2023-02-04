@app
grungetest-1eec

@aws
architecture x86_64
runtime nodejs18.x
timeout 10
#policies 
#  architect-default-policies 
#  AWSLambdaVPCAccessExecutionRole

@http
/*
  method any
  src server

@static

@tables
user
  pk *String

password
  pk *String # userId

note
  pk *String  # userId
  sk **String # noteId
