###
  Studio.js takes care of refresh
###
class window.Studio
  requiresAndroidSupport: (typeof AndroidAPIBridge != 'undefined')

  constructor: ()->
    console.log "Constructing Studio" if @debug

    #create ui event listeners
    @observe_ui()

    if @requiresAndroidSupport
      console.log "Setting up Android communication..." if @debug
      AndroidAPIBridge.registerHandler("studio.message_handler")
      @android_boot()
    else
      console.log "Opening websocket..." if @debug
      @websocket = new WebSocket "ws://localhost:31337"
      @websocket.onmessage = @message_handler
      console.log "Get endpoint url..." if @debug
      @websocket.onopen = @on_open_handler
      @websocket.onclose = @reopen

    document.ontouchmove = (e)=>
      e.preventDefault()

  debug: false

  # timestamp to compare against studio build
  #last_build: (new Date()).getTime()+2000

  # unique identifier for callbacks (read using @uid++ to keep it returning unique number)
  uid: 0
  # callbacks
  callbacks: {}

  # this is used to keep track of archives extracted
  archives_to_extract: null
  # this is used to keep track of separate files downloaded
  files_to_download: null

  # endpoint url is stored here
  endpoint_url: null
  # application.json url is stored here
  json_url: null

  # server host is stored here
  host: null
  port: null

  # websocket is stored here
  websocket: null

  android_boot: ()=>
    @get_end_point_url ()=>
      console.log "Endpoint url: %{@host}:%{port}" if @debug
      if @host is "livepreview.appgyver.com"
        return

      @get_application_json(true, (json)=>
        @application_json = json
        @poll_studio_for_refresh ()=>
          @start_and_load()
      , (status, response)=>
        # AG.GUI.alert "Error initializing refresh", "Could not properly initialize automatic refresh for your project. If the refresh fails to work, please restart the Preview app and try again."
      )


  on_open_handler: ()=>
    @run_noop()

    @get_end_point_url ()=>
      console.log "Got endpoint url" if @debug
      @listen_shake()
      # start fetching information from studio server when to refresh
      unless @host is "livepreview.appgyver.com"
        console.log "Getting application.json (for run specific settings)..." if @debug
        @get_application_json(true, (json)=>
          @application_json = json
          @poll_studio_for_refresh ()=>
            # run this when refresh should happen
            @start_and_load()
        , (status, response)=>
          # AG.GUI.alert "Error initializing refresh", "Could not properly initialize automatic refresh for your project. If the refresh fails to work, please restart the Preview app and try again."
        )
        #@unfreeze()

  run_noop: ()=>
    setInterval(()=>
      @send "noop"
    , 1000)

  reopen: ()=>
    @websocket = new WebSocket "ws://localhost:31337"
    @websocket.onmessage = @message_handler
    @websocket.onopen = @on_open_handler
    @websocket.onclose = @reopen

  listen_shake: ()=>
    # listen shake event
    window.deviceShakenByUser = ()=>
      @send "showApplicationSelection"

  # get endpoint url (populates @host, @port and @json_url)
  get_end_point_url: (callback)=>
    @send "getEndpointURL",
      callbacks:
        success: (parameters)=>
          if /livepreview\.appgyver\.com/.test parameters.endpointURL
            @host = "livepreview.appgyver.com"
            callback.call(@,@)
          else
            console.log "Received Endpoint URL: #{JSON.stringify(parameters)}" if @debug
            @host = parameters.endpointURL.match(/(.*):(\d*)/)[1]
            @port = parameters.endpointURL.match(/(.*):(\d*)/)[2]
            @json_url = "http://#{@host}:#{@port}/appgyver/api/applications/1.json"
            console.log "Parsed endpoint to: host: #{@host}, port: #{@port}, json_url: #{@json_url}" if @debug
            callback.call(@,@)
        failure: ()=>
          console.log "Could not load Endpoint URL." if @debug

  poll_studio_for_refresh: (callback)=>
    clearInterval @refresh_poller if @refresh_poller?
    console.log "Start polling studio for refresh trigger" if @debug
    refresh_url = "http://#{@host}:#{@port}/refresh_client?#{@application_json.build_timestamp}"
    console.log "Refresh url is: #{refresh_url}" if @debug
    @refresh_poller = setInterval(()=>
      xhr = new XHR refresh_url,
        success: (response)=>
          #console.log "Refresh poll: #{response}" if @debug
          if response
            # @freeze() # <--- does not work in background view, at least at this moment. :o
            window.clearInterval @refresh_poller
            #console.log "Refreshing." if @debug
            callback.call()

        failure: ()=>
          console.log "Studio refresh trigger responsed failed." if @debug
    , 1000)

  # observe DOM actions
  observe_ui: ()=>
    document.addEventListener "DOMContentLoaded", ()=>
      back_to_scanner.addEventListener "touchstart", ()=>
        @send("cancelAllDownloads")
        @send("showApplicationSelection")

      # add spinner
      @spinner()
      @spinner_hide()


  # handler incoming websocket messages
  message_handler: (e)=>
    if @requiresAndroidSupport
      console.log "Received message #{e}" if @debug
      if e != null
        data = JSON.parse(e)
      else
        data = e
    else
      console.log "Received message #{e.data}" if @debug
      data = JSON.parse(e.data)

    if data?.callback?
      console.log "Websocket responded with callback" if @debug
      if @callbacks[data.callback]?
        console.log "Running callback #{data.callback} with parameters: #{JSON.stringify data.parameters}" if @debug
        @callbacks[data.callback].call(data.parameters, data.parameters)

  # send client requests via websocket, this function takes care of callback returns (pass options.succcess & options.failure)
  send: (method, options)=>
    console.log "Sending websocket #{method}" if @debug
    # human readable names for callbacks
    if options?.callbacks?
      console.log "Preparing callbacks" if @debug
      callback_name = "#{method}_#{@uid++}"
      callbacks =
        success: "#{callback_name}_success"
        failure: "#{callback_name}_fail"
        recurring: "#{callback_name}_recurring"

      console.log "Success!" if @debug
      # store the success callback
      if options.callbacks.success?
        @callbacks[callbacks.success] = (parameters)=>
          # remove both callbacks on success (as they are no longer required)
          console.log "Running callback success with parameters #{JSON.stringify(parameters)}" if @debug
          delete @callbacks[callbacks.success]
          delete @callbacks[callbacks.failure]
          options.callbacks.success.call(parameters, parameters)
      # store the recurring callback
      if options.callbacks.recurring?
        @callbacks[callbacks.recurring] = (parameters)=>
          # remove both callbacks on success (as they are no longer required)
          console.log "Running callback recurring with parameters #{JSON.stringify(parameters)}" if @debug
          options.callbacks.recurring.call(parameters, parameters)
      # store the failure callback
      console.log "Failure!" if @debug
      if options.callbacks.failure?
        @callbacks[callbacks.failure] = (parameters)=>
          # remove both callbacks on failure too (as they are no longer required)
          console.log "Running callback failure with parameters #{JSON.stringify(parameters)}" if @debug
          delete @callbacks[callbacks.success]
          delete @callbacks[callbacks.failure]
          options.callbacks.failure.call(parameters, parameters)
    else
      callbacks = {}

    console.log "Generating request JSON" if @debug
    request = JSON.stringify
      method: method
      parameters: if options?.parameters? then options.parameters else {}
      callbacks: callbacks

    console.log "Sending request: #{request}" if @debug

    if @requiresAndroidSupport
      AndroidAPIBridge.send request
    else
      if @websocket.readyState is 0
        @websocket.addEventListener "open", ()=>
          @websocket.send request
      else
        @websocket.send request

  # construct application.json urls for local/cloud
  url: ()=>
    if arguments.length is 1
      @host = arguments[0]
      @port = 4567
      localStorage.setItem "ip", arguments[0]
      "http://#{arguments[0]}:4567/appgyver/api/applications/1.json"

  start_and_load: ()=>
    if !@already_starting
      @already_starting = true

      @start @load
    else
      console.log "doublestart!" if @debug

  # start by getting application.json
  start: (callback)=>
    @archives_to_extract = null
    @files_to_download = null
    @is_finished = false # bool to monitor when app starts up

    progressbar.style.display = 'block'
    @spinner_show()

    @send "showBackgroundWebView"

    @get_application_json(false, (json)=>
      @keep_data = json.keep_data

      # check for client version in application.json
      @alert_about_different_mode json, ()=>
        console.log "success" if @debug
        console.log "#{JSON.stringify json}" if @debug

        if json.bottom_bars.length is 0 and json.configuration.fullscreen is "false"
          @fail_with_retry_message "Your non-full-screen project has no tab bar buttons and thus could not be loaded. To fix this, go to AppGyver Studio and add a tab bar button, or switch your project to full-screen mode. Would you like to try again?"
        else
          @application_json = json
          callback.call() if callback?

    , (status, response)=>
      @fail_with_retry_message "Could not open a connection between AppGyver Studio and your Preview app. Try again?", callback
    )

    @start_timeout = setTimeout(()=>
      if @selected_tab is "local" and !@is_finished
        @fail_with_retry_message "Loading your project failed: establish a connection with AppGyver Studio timed out. Would you like to try again?", callback
    , 10000)

  # invisible request uses invisble parameter in url to define that studio should not react to this by showing 'client connected' log
  get_application_json: (invisible_request, success, failure)=>
    url = @json_url
    url += '?invisible' if invisible_request
    xhr = new XHR url,
      success: success
      failure: failure

  # load application files
  load: ()=>
    console.log "Loading application..." if @debug

    if @application_json.build_timestamp
      @application_json.path = "applications/local/#{@application_json.build_timestamp}"
    else
      @application_json.path = "applications/cloud/#{Math.round(new Date().getTime() / 1000)}"

    @handle_archives()
    @handle_files()
    @finish_interval = setInterval(()=>
      if (@files_to_download? and @files_to_download is 0) or !@files_to_download?
        if (@archives_to_extract? and @archives_to_extract is 0) or !@archives_to_extract?
          clearInterval @finish_interval
          @finish()
    , 50)

  # go through archives by downloading and immediately extracting them
  handle_archives: ()=>
    console.log "Handling archives..." if @debug
    @archives_to_extract = @application_json.archives.length
    @download_archive archive for archive in @application_json.archives when archive.url?

  download_archive: (archive)=>
    console.log "downloading archive.." if @debug
    # name the archive uniquely
    my_uid = @uid++
    name = "#{@application_json.path}/__appgyver/archives/archive_#{my_uid}"
    @send "downloadFile",
      parameters:
        filenameWithPath: name
        url: archive.url
      callbacks:
        recurring: (params)=>
          downloaded.innerHTML = params.downloaded
          size.innerHTML = params.size
          percentage.innerHTML = Math.round(params.downloaded * 100 / params.size)
          rate.innerHTML = params.rate
          progressinner.style.width = Math.round(params.downloaded * 100 / params.size) + '%'
        success: ()=>
          @extract_archive name
        failure: ()=>
          # when something fails, just remove ALL callbacks and wipe the device
          delete @callbacks[key] for key, val in @callbacks
          @fail_with_retry_message "Loading your application failed due to a network download issue. Would you like to try again?"

  extract_archive: (name)=>
    console.log "extracting archive.." if @debug
    @send "unzip",
      parameters:
        filenameWithPath: name
        path: @application_json.path
      callbacks:
        success: ()=>
          @archives_to_extract--
        failure: ()=>
          @fail_with_retry_message "Loading your application failed due to an issue with extracting the app archive. Would you like to try again?"

  handle_files: ()=>
    console.log "handling files.." if @debug
    @files_to_download = @application_json.files.length
    for file in @application_json.files
      @send "downloadFile",
        parameters:
          filenameWithPath: "#{@application_json.path}/#{file.path}"
          url: file.url
        callbacks:
          success: ()=>
            @files_to_download--
          failure: ()=>
            @fail_with_retry_message "Loading your application failed due to a network download issue. Would you like to try again?"

  fail_with_retry_message: (message)=>
    clearInterval @finish_interval if @finish_interval?
    @already_starting = false
    @files_to_download = 0
    @archives_to_extract = 0
    con = confirm message
    if con
      @start @load
    else
      @send "showApplicationSelection"

  # complete boot process
  finish: ()=>
    @is_finished = true
    console.log "Finish" if @debug

    localStorage.setItem "__appgyver_startpreview_previous_application_json", JSON.stringify(@application_json)

    @send "startApplication",
      parameters:
        application: @application_json
        server_host: @host
        server_port: @port

  get_edge_mode: (cb)=>
    @send "getEdgeMode",
      callbacks:
        success: cb

  set_edge_mode: (bool,cb)=>
    @send "setEdgeMode",
      parameters:
        edgeMode: (if bool then 1 else 0)
      callbacks:
        success: cb

  spinner: ()=>
    opts =
      lines: 12   # The number of lines to draw
      length: 3   # The length of each line
      width: 2    # The line thickness
      radius: 4  # The radius of the inner circle
      color: '#000' # #rgb or #rrggbb
      speed: 1    # Rounds per second
      trail: 60   # Afterglow percentage
      shadow: false # Whether to render a shadow
      hwaccel: true  # Whether to use hardware acceleration
    @spinner_element = document.querySelector '#spinner'
    spinner = new Spinner(opts).spin(@spinner_element)

  spinner_show: ()=>
    @spinner_element.style.display = "-webkit-box"

  spinner_hide: ()=>
    @spinner_element.style.display = "none"

  alert_about_different_mode: (json, cb)=>
    if json.configuration.client_version?
      # get edge mode
      @get_edge_mode (edge_json)=>
        console.log "EDGE: #{JSON.stringify(edge_json)} JSON.CONFIGURATION.CLIENT_VERSION: #{json.configuration.client_version}" if @debug
        # when client is edge but application.json client_version isn't
        if edge_json.edgeMode is "true" and json.configuration.client_version isnt "edge"
          @set_edge_mode false, ()=>
            @send "alert",
              parameters:
                title: "Preview app client mode mismatch"
                message: "Your project is set to run in normal mode, while your Preview app's client mode is Edge. To let you preview your app, we've changed the Preview app's client mode to normal. Please restart the Preview app for the changes to take effect."
        # and when client is normal but application.json client version isn't
        else if edge_json.edgeMode is "false" and json.configuration.client_version isnt "normal"
          @set_edge_mode true, ()=>
            @send "alert",
              parameters:
                title: "Preview app client mode mismatch"
                message: "Your project is set to run in Edge mode, while your Preview app's client mode is normal. To let you preview your app, we've changed the Preview app's client mode to Edge . Please restart the Preview app for the changes to take effect."
        else
          cb.call() if cb? and typeof cb is "function"
    else
      # if client version is not returned from studio, it must be older than expected, tell user about this
      @send "alert",
        parameters:
          title: "Studio upgrade required"
          message: "The version of AppGyver Studio you are running is old and does not support this version of the Preview app. Please upgrade your AppGyver Studio to the latest version."


console.log "Startup!" if @debug
window.studio = new Studio()


class CloudPreview

  constructor: ->
    @lastTimestamp = Math.round((new Date).getTime() / 1000)
    @lastCloudBuild = null
    @refreshPoller = null

  poll: (id, hash) =>
    return if @refreshPoller

    @refreshPoller = setInterval =>

      xhr = new XHR "https://livepreview.appgyver.com/__appgyver/api/reload/#{id}.json",
        success: (response) =>

          return unless response.lastUpdated

          @lastCloudBuild = parseInt(response.lastUpdated)

          if @lastCloudBuild > @lastTimestamp
            @lastTimestamp = @lastCloudBuild

            window.studio.already_starting = false
            @reboot(id, hash)

    , 1000

  reboot: (id, hash) =>
    clearInterval @refreshPoller
    window.studio.json_url = "https://livepreview.appgyver.com/appgyver/api/applications/#{id}.json?hash=#{hash}"
    window.studio.start_and_load()


window.cloudPreview = new CloudPreview()
