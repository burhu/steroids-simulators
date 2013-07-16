class window.XHR
  constructor: (@url, @opts)->
    @merge_options()

    @request = new XMLHttpRequest
    @request.onreadystatechange = @done_handler

    @request.open @opts.type, @url
    @setup_header()
    if @opts.data?
      @request.send JSON.stringify @opts.data  # ( is "object" then JSON.stringify @opts.body else @opts.body)
    else
      @request.send()

    return @request

  ###
    When request is done, done handler is called
  ###
  done_handler: ()=>
    if @request.readyState is 4
      if @request.status is 200 or @request.status is 201 or @request.status is 202
        # Android's JSON.parse crashes when given null or undefined, need to check for it
        if @request.response
          response = JSON.parse(@request.response)
        else if @request.responseText
          # XMLHttpRequest v2.0 isn't supported by Android 2.3,
          # need to use responseText instead of response
          response = JSON.parse(@request.responseText)
        else
          response = null

        @opts.success?.call @request, response, @request.status, @request
      else
        @opts.failure?.call @request, @request.status, @request

  ###
    Sets up URL parameters
  ###
  setup_params: ()=>



  ###
    Default settings:
  ###
  default_opts: ()=>
    defaults =
      type: "GET"
      headers: @default_headers()
    return defaults

  default_headers: ()=>
    defaults =
      "Content-Type": "application/json"
      "Accepts": "application/json, text/javascript, text/plain, text/html, */*"
    return defaults

  ###
    Merge options
  ###
  merge_options: ()=>
    for key, value of @default_opts()
      @opts[key] = value unless @opts[key]?
    @merge_headers()

  merge_headers: ()=>
    unless @opts["headers"]?
      @opts["headers"] = @default_headers()
    else
      for key, value of @default_headers()
        @opts["headers"][key] = value unless @opts["headers"][key]?

  ###
    Sets up header from options
  ###
  setup_header: ()=>
    if @opts.headers?
      for key, value of @opts.headers
        @request.setRequestHeader key, value