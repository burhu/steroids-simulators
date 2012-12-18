class BootLoader
  requiresAndroidSupport: (typeof AndroidAPIBridge != 'undefined')

  constructor: ()->
    console.log "constructor" if @debug
    #create ui event listeners
    @observe_ui()

    if @requiresAndroidSupport
      AndroidAPIBridge.registerHandler("boot.message_handler")
    else
      @open_API_socket()

    # used by simulator to auto-connect to localhost
    window.onload = ()=>
      if window.location.href.search("first_time") != -1
        @connect_to_localhost()

      $("body").animate({ opacity: 100 })


    document.ontouchmove = (e)=>
      e.preventDefault()


  # set to true for console.log debug messages
  debug: false

  # unique identifier for callbacks (read using @uid++ to keep it returning unique number)
  uid: 0

  # callbacks
  callbacks: {}

  # used to keep track of files and archives that will be downloaded/extracted
  files_to_download: null
  archives_to_download: null
  archives_to_extract: null

  # application.json url is stored here
  json_url: null

  # websocket is stored here
  websocket: null

  # previously used appgyver:// link
  previousLink: localStorage.getItem "__appgyver_startpreview_previous_link"

  # previously downloaded application.json
  previousApplicationJSONString: localStorage.getItem "__appgyver_startpreview_previous_application_json"

  # used by simulator to speed-connect to localhost
  connect_to_localhost: ()=>
    console.log "Autoconnecting" if @debug
    @get_ip_address (ip)=>
      console.log "getURL callback" if @debug
      @json_url = @local_url_for_ip ip

      # @start by getting application.json and then @load the application
      @start @load

  get_ip_address: (callback)->
    # returns this device's IP address
    @send "getIPAddress",
      callbacks:
        success: (parameters)=>
          console.log "Received IP address: #{JSON.stringify(parameters)}" if @debug
          callback(parameters.ipAddress)
        failure: ()=>
          console.log "Could not load endpoint URL." if @debug

  reopenApplicationFromDisk: ()->
    progressbar.style.display = 'block'
    @spinner_show()

    link = @previousLink
    @application_json = JSON.parse(@previousApplicationJSONString)

    id = @getParameterFromLinkByName link, "id"

    if id != ""
      hash = @getParameterFromLinkByName link, "hash"
      @json_url = @hash_url id, hash

      @alert_about_different_mode @application_json, ()=>
        console.log "Client and Studio have same client mode, yay" if @debug
        console.log "#{JSON.stringify @application_json}" if @debug
        if @application_json.bottom_bars.length is 0 and @application_json.configuration.fullscreen is "false"
          @fail_with_message "Loading the app failed", "No tab bars in a non-fullscreen project. Fix this by switching your project to fullscreen or adding some tabs, and then connecting again."
        else
          @finish()
    else
      ip_addresses = JSON.parse @getParameterFromLinkByName(link, "ips")
      @select_correct_ip ip_addresses, (ip_address)=>
        @json_url = @local_url_for_ip ip_address

        @alert_about_different_mode @application_json, ()=>
          console.log "Client and Studio have same client mode, yay" if @debug
          console.log "#{JSON.stringify @application_json}" if @debug
          if @application_json.bottom_bars.length is 0 and @application_json.configuration.fullscreen is "false"
            @fail_with_message "Loading the app failed", "No tab bars in a non-fullscreen project. Fix this by switching your project to fullscreen or adding some tabs, and then connecting again."
          else
            @finish()

  connect_by_link: (link)->
    progressbar.style.display = 'block'
    @spinner_show()

    @setPreviousLink link

    id = @getParameterFromLinkByName link, "id"

    if id != ""
      hash = @getParameterFromLinkByName link, "hash"
      @json_url = @hash_url id, hash

      @start @load
    else
      ip_addresses = JSON.parse @getParameterFromLinkByName(link, "ips")
      @select_correct_ip ip_addresses, (ip_address)=>
        @json_url = @local_url_for_ip ip_address

        @start @load

    #TODO: Fail nicely if bad URL

  setPreviousLink: (link)->
    localStorage.setItem "__appgyver_startpreview_previous_link", link
    @previousLink = link

  getParameterFromLinkByName: (link, name) ->
    name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]")
    regexS = "[\\?&]" + name + "=([^&#]*)"
    regex = new RegExp(regexS)
    results = regex.exec(URI(link).search())
    if results == null
      ""
    else
      decodeURIComponent(results[1].replace(/\+/g, " "))

  # Fuk mitä paskaa
  select_correct_ip: (ip_addresses, callback)->
    console.log "Got ip addresses: #{JSON.stringify(ip_addresses)}" if @debug
    @get_ip_address (current_ip)=>
      console.log "Comparing to local ip: #{current_ip}" if @debug
      block_regex = /^([0-9]+\.[0-9]+\.[0-9]+)\.[0-9]+$/
      for ip in ip_addresses
        console.log "comparing #{ip.match(block_regex)[1]} to #{current_ip.match(block_regex)[1]}" if @debug
        if ip.match(block_regex)[1] == current_ip.match(block_regex)[1]
          callback(ip)
          return

      # first 3 did not match, so try with first 2 blocks
      block_regex = /^([0-9]+\.[0-9]+)\.[0-9]+\.[0-9]+$/
      for ip in ip_addresses
        console.log "comparing #{ip.match(block_regex)[1]} to #{current_ip.match(block_regex)[1]}" if @debug
        if ip.match(block_regex)[1] == current_ip.match(block_regex)[1]
          callback(ip)
          return

      # first 2 did not match, so try with first block only
      block_regex = /^([0-9]+)\.[0-9]+\.[0-9]+\.[0-9]+$/
      for ip in ip_addresses
        console.log "comparing #{ip.match(block_regex)[1]} to #{current_ip.match(block_regex)[1]}" if @debug
        if ip.match(block_regex)[1] == current_ip.match(block_regex)[1]
          callback(ip)
          return

      #TODO: Handle errors
      console.log "Could not find matching IP" if @debug
      callback("127.0.0.1")

  hash_url: (id, hash) ->
    "http://livepreview.appgyver.com/appgyver/api/applications/#{id}.json?hash=#{hash}"

  local_url_for_ip: (ip)->
    "http://#{ip}:4567/appgyver/api/applications/1.json"

  # start by getting application.json
  start: (callback)=>
    @archives_to_extract = null
    @files_to_download = null
    # clean up?
    if !@already_started
      @already_started = true

      progressbar.style.display = 'block'

      @send "wipeDevice",
        callbacks:
          success: ()=>
            @is_finished = false # bool to monitor when app starts up
            xhr = new XHR @json_url,
              success: (json)=>
                @alert_about_different_mode json, ()=>
                  console.log "Client and Studio have same client mode, yay" if @debug
                  console.log "#{JSON.stringify json}" if @debug
                  if json.bottom_bars.length is 0 and json.configuration.fullscreen is "false"
                    @fail_with_message "Loading the app failed", "No tab bars in a non-fullscreen project. Fix this by switching your project to fullscreen or adding some tabs, and then connecting again."
                  else
                    @application_json = json

                    callback.call() if callback?
              failure: (status, response)=>
                if URI(@json_url).hostname() == "livepreview.appgyver.com"
                  @fail_with_message "Connection error", "Could not open a connection to AppGyver Cloud. Please check your Internet connectivity."
                else
                  @fail_with_message "Connection error", "Could not open a connection to your development environment.  Please check that both are in the same network.  You may also try to restart this application and your development environment."
    else
      console.log "User double-tapped, prevented this!" if @debug


  # load application files
  load: ()=>
    console.log "Loading the application..." if @debug

    if @application_json.build_timestamp
      @application_json.application_path = "applications/local/#{@application_json.build_timestamp}"
    else
      @application_json.application_path = "applications/cloud/#{Math.round(new Date().getTime() / 1000)}"

    @archives_to_extract = @application_json.archives.length
    @archives_to_download = @application_json.archives.length
    @files_to_download = @application_json.files.length
    @total_files = @application_json.files.length + @application_json.archives.length

    @handle_archives()
    @handle_files()

    @finish_interval = setInterval(()=>
      if ((@files_to_download? and @files_to_download is 0) or !@files_to_download?) and ((@archives_to_download? and @archives_to_download is 0) or !@archives_to_download?) and ((@archives_to_extract? and @archives_to_extract is 0) or !@archives_to_extract?)
        clearInterval @finish_interval
        @finish()
    , 50)

  # go through archives by downloading and immediately extracting them
  handle_archives: ()=>
    console.log "Composing an array of archives to download..." if @debug
    @download_archive archive for archive in @application_json.archives when archive.url?

  download_archive: (archive)=>
    console.log "Handling the app archives..." if @debug
    # name the archive uniquely
    my_uid = @uid++
    name = "#{@application_json.application_path}/__appgyver/archives/archive_#{my_uid}"
    @send "downloadFile",
      parameters:
        filenameWithPath: name
        url: archive.url
      callbacks:
        recurring: (params)=>
          downloaded.innerHTML = params.downloaded
          size.innerHTML = params.size
          percentage.innerHTML = Math.round(params.downloaded * 100 / params.size)
          progressinner.style.width = Math.round(params.downloaded * 100 / params.size) + '%'
        success: ()=>
          @extract_archive name
          @archives_to_download--
        failure: ()=>
          # when something fails, just remove ALL callbacks and wipe the device
          delete @callbacks[key] for key, val in @callbacks
          @fail_with_message "Loading the app failed", "Could not download all of the app archives. Please try again. If the problem persists, try restarting this application."

  extract_archive: (name)=>
    console.log "Extracting app archive..." if @debug
    @send "unzip",
      parameters:
        filenameWithPath: name
        path: @application_json.application_path
      callbacks:
        success: ()=>
          @archives_to_extract--
        failure: ()=>
          @fail_with_message "Loading the app failed", "Could not extract all of the app archives. Please try again. If the problem persists, try restarting this application."

  handle_files: ()=>
    console.log "Handling files..." if @debug

    for file in @application_json.files
      @send "downloadFile",
        parameters:
          filenameWithPath: "#{@application_json.application_path}/#{file.path}"
          url: file.url
        callbacks:
          success: ()=>
            @files_to_download--
          failure: ()=>
            @fail_with_message "Loading the app failed", "Could not start the application. Please try again. If the problem persists, try restarting this application."

  # complete boot process
  finish: ()=>
    console.log "Finish" if @debug
    @is_finished = true
    @already_started = false

    localStorage.setItem "__appgyver_startpreview_previous_application_json", JSON.stringify(@application_json)

    @send "startApplication",
      parameters:
        id: @application_json.id
        name: @application_json.name
        path: @application_json.application_path
        server_host: URI(@json_url).hostname()
        server_port: ( URI(@json_url).port() || "80" )
        bottom_bars:  @application_json.bottom_bars
        configuration: @application_json.configuration
        appearance: @application_json.appearance
        authentication: @application_json.authentication
        update: @application_json.update
    @spinner_hide()

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

  alert_about_different_mode: (json, cb)=>
    # get edge mode
    @get_edge_mode (edge_json)=>
      console.log "EDGE: #{JSON.stringify(edge_json)} JSON.CONFIGURATION.CLIENT_VERSION: #{json.configuration.client_version}" if @debug
      # when client is edge but application.json client_version isn't
      if edge_json.edgeMode is "true" and json.configuration.client_version isnt "edge"
        @fail_with_message "Project in legacy mode",
          "The project you are trying to preview is a legacy project. Go to http://www.appgyver.com/legacy for upgrade instructions."
      else
        cb.call() if cb? and typeof cb is "function"

  # fail the StartPreview process with the given message
  fail_with_message: (title, message)=>
    @fail_without_message()

    @show_alert title, message

  fail_without_message: =>
    if @already_started
      @already_started = false

    reopen.className = "reopen_image disableable"
    progressinner.style.width = '0%'
    progressbar.style.display = 'none'

    clearInterval @finish_interval if @finish_interval?
    # clearTimeout @start_timeout if @start_timeout? # deprecated after removing 10 sec hardcoded timeout

    @files_to_download = 0
    @archives_to_extract = 0

    @send "cancelAllDownloads"

    @spinner_hide()

  #-----UI-----
  # method for showing an alert, override to change how alerts are shown
  show_alert: (title, message)->
    # AG.GUI.alert title, message
    @send "alert",
         parameters:
           title: title
           message: message

  # observe DOM actions
  observe_ui: ()=>
    document.addEventListener "DOMContentLoaded", ()=>

      scan_qr_code.addEventListener "touchstart", ()=>

        scan_qr_code.className = "scan_image scan_image_hover disableable"

      scan_qr_code.addEventListener "touchend", ()=>

        window.plugins.barcodeScanner.scan (result)=>

          scan_qr_code.className = "scan_image disableable"

          unless result.cancelled
            @connect_by_link result.text

      reload.addEventListener "touchstart", ()=>
        if @previousLink

          reload.className = "reload_image reload_image_hover disableable"

          @connect_by_link @previousLink
        else
          @fail_with_message "No QR codes in memory", "No QR codes scanned yet. Use the scan button to scan a QR code."

      reopen.addEventListener "touchstart", ()=>
        if @previousApplicationJSONString

          reopen.className = "reopen_image reopen_image_hover disableable"

          @reopenApplicationFromDisk()
        else
          @fail_with_message "No application in memory", "No applications stored in memory yet. Use the scan button to scan a QR code."

      cancel_download.addEventListener "touchstart", ()=>
        @fail_without_message()


      # add spinner
      @spinner()
      @spinner_hide()

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
    @input_disable()

  spinner_hide: ()=>
    @spinner_element.style.display = "none"
    @input_enable()

  input_disable: ()=>
    for element in document.querySelectorAll ".disableable"
      element.disabled = "disabled"

  input_enable: ()=>
    for element in document.querySelectorAll ".disableable"
      element.disabled = ""

  # disable the current view with a title and message
  disable_view: (title, message)=>

    div = document.createElement "div"
    div.setAttribute "id", "disabler"

    h1 = document.createElement "h1"
    h1.textContent = title
    div.appendChild h1

    p1 = document.createElement "p"
    p1.textContent = message
    div.appendChild p1

    # Fun extra stuff
    p2 = document.createElement "p"
    p2.textContent = "For your troubles, here is a cheerful ASCII character throwing sparkles:"
    div.appendChild p2

    p3 = document.createElement "p"
    code = document.createElement "code"
    code.textContent = "(ﾉ^ヮ^)ﾉ*:･ﾟ✧"
    p3.appendChild code
    div.appendChild p3

    document.querySelector("body").appendChild div

    @spinner_element.style.display = "none"
    @is_finished = true
    div.ontouchmove (e)=>
      e.preventDefault
    # clearTimeout @start_timeout if @start_timeout? # deprecated after removing 10 second hardcoded timeout
    clearInterval @finish_interval if @finish_interval?

  enable_view: ()=>
    disabler.parentNode.removeChild disabler

  # Websocket methods for StartPreview/Background


  open_API_socket: ()=>
    @websocket = new WebSocket "ws://localhost:31337"
    @websocket.onmessage = @message_handler
    @websocket.onopen = @run_noop
    @websocket.onclose = @open_API_socket
    console.log "Websocket opened" if @debug

  # handler incoming websocket messages
  message_handler: (e)=>
    if @requiresAndroidSupport
      # Android doesn't pass in callback objects wrapped in an event object
      # JSON.parse on Android crashes on null and undefined, needs a check
      console.log "Received message #{e}" if @debug
      if e
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

  run_noop: ()=>
    setInterval(()=>
      @send "noop"
    , 1000)

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

window.boot = new BootLoader()
