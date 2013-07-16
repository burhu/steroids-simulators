class BootLoader
  constructor: ()->
    steroids.debug "constructor"
    #create ui event listeners
    @observe_ui()

    # used by simulator to auto-connect to localhost
    window.onload = ()=>
      if window.location.href.search("simulator_start") != -1
        @connect_to_localhost()
      else
        if window.location.href.search("initial_start") != -1
          if @previousApplicationJSONString?
            if JSON.parse(@previousApplicationJSONString).path? && JSON.parse(@previousApplicationJSONString).path != ""
              @reopenApplicationFromDisk()

      $("body").animate({ opacity: 100 })

      # document.addEventListener "deviceready", ()=>
      #   window.pushNotification.enablePush()
      #
      #   window.pushNotification.registerForNotificationTypes(window.pushNotification.notificationType.badge | window.pushNotification.notificationType.sound | window.pushNotification.notificationType.alert)
      #
      #   # Reset Badge on resume
      #   document.addEventListener "resume", ()=>
      #     window.pushNotification.resetBadge()
      #
      #   window.pushNotification.getIncoming (incoming)=>
      #     alert incoming.message if incoming.message
      #
      #   window.pushNotification.registerEvent "registration", ()=>
      #     steroids.debug "Registered for push notifications"
      #
      #   window.pushNotification.registerEvent "push", (data)=>
      #     alert data.message

    document.ontouchmove = (e)=>
      e.preventDefault()

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

  port: "4567"

  # used by simulator to speed-connect to localhost
  connect_to_localhost: ()=>
    steroids.debug "Autoconnecting"
    @get_ip_address (ip)=>
      steroids.debug "getURL callback"
      @json_url = @local_url_for_ip ip

      # @start by getting application.json and then @load the application
      @start @load

  get_ip_address: (callback)->
    # returns this device's IP address
    @send "getIPAddress",
      callbacks:
        success: (parameters)=>
          steroids.debug "Received IP address: #{JSON.stringify(parameters)}"
          callback(parameters.ipAddress)
        failure: ()=>
          steroids.debug "Could not load endpoint URL."

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
        steroids.debug "Client and Studio have same client mode, yay"
        steroids.debug "#{JSON.stringify @application_json}"
        if @application_json.bottom_bars.length is 0 and @application_json.configuration.fullscreen is "false"
          @fail_with_message "Loading the app failed", "No tab bars in a non-fullscreen project. Fix this by switching your project to fullscreen or adding some tabs, and then connecting again."
        else
          @finish()
    else
      ip_addresses = JSON.parse @getParameterFromLinkByName(link, "ips")
      @port = @getParameterFromLinkByName(link, "port")
      steroids.debug "Parsed port: #{@port}"

      if !@port? || ( @port == "" )
        steroids.debug "Setting port to default 4567"
        @port = "4567"

      @select_correct_ip ip_addresses, (ip_address)=>
        @json_url = @local_url_for_ip ip_address

        @alert_about_different_mode @application_json, ()=>
          steroids.debug "Client and Studio have same client mode, yay"
          steroids.debug "#{JSON.stringify @application_json}"
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
      @port = @getParameterFromLinkByName(link, "port")
      steroids.debug "Parsed port: #{@port}"

      if !@port? || ( @port == "" )
        steroids.debug "Setting port to default 4567"
        @port = "4567"

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
    steroids.debug "Got ip addresses: #{JSON.stringify(ip_addresses)}"
    @get_ip_address (current_ip)=>
      steroids.debug "Comparing to local ip: #{current_ip}"
      block_regex = /^([0-9]+\.[0-9]+\.[0-9]+)\.[0-9]+$/
      for ip in ip_addresses
        steroids.debug "comparing #{ip.match(block_regex)[1]} to #{current_ip.match(block_regex)[1]}"
        if ip.match(block_regex)[1] == current_ip.match(block_regex)[1]
          callback(ip)
          return

      # first 3 did not match, so try with first 2 blocks
      block_regex = /^([0-9]+\.[0-9]+)\.[0-9]+\.[0-9]+$/
      for ip in ip_addresses
        steroids.debug "comparing #{ip.match(block_regex)[1]} to #{current_ip.match(block_regex)[1]}"
        if ip.match(block_regex)[1] == current_ip.match(block_regex)[1]
          callback(ip)
          return

      # first 2 did not match, so try with first block only
      block_regex = /^([0-9]+)\.[0-9]+\.[0-9]+\.[0-9]+$/
      for ip in ip_addresses
        steroids.debug "comparing #{ip.match(block_regex)[1]} to #{current_ip.match(block_regex)[1]}"
        if ip.match(block_regex)[1] == current_ip.match(block_regex)[1]
          callback(ip)
          return

      #TODO: Handle errors
      steroids.debug "Could not find matching IP"
      callback("127.0.0.1")

  hash_url: (id, hash) ->
    "http://livepreview.appgyver.com/appgyver/api/applications/#{id}.json?hash=#{hash}&client_version=#{window.AG_CLIENT_VERSION}"

  local_url_for_ip: (ip)->
    "http://#{ip}:#{@port || 4567}/appgyver/api/applications/1.json?client_version=#{window.AG_CLIENT_VERSION}"

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
            steroids.debug "Connecting to: #{@json_url}"
            xhr = new XHR @json_url,
              success: (json)=>
                @alert_about_different_mode json, ()=>
                  steroids.debug "Client and Studio have same client mode, yay"
                  steroids.debug "#{JSON.stringify json}"
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
      steroids.debug "User double-tapped, prevented this!"


  # load application files
  load: ()=>
    steroids.debug "Loading the application..."

    if @application_json.build_timestamp
      @application_json.path = "applications/local/#{@application_json.build_timestamp}"
    else
      @application_json.path = "applications/cloud/#{Math.round(new Date().getTime() / 1000)}"

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
    steroids.debug "Composing an array of archives to download..."
    @download_archive archive for archive in @application_json.archives when archive.url?

  download_archive: (archive)=>
    steroids.debug "Handling the app archives..."
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
          progressinner.style.width = Math.round(params.downloaded * 100 / params.size) + '%'
        success: ()=>
          @extract_archive name
          @archives_to_download--
        failure: ()=>
          # when something fails, just remove ALL callbacks and wipe the device
          delete @callbacks[key] for key, val in @callbacks
          @fail_with_message "Loading the app failed", "Could not download all of the app archives. Please try again. If the problem persists, try restarting this application."

  extract_archive: (name)=>
    steroids.debug "Extracting app archive..."
    @send "unzip",
      parameters:
        filenameWithPath: name
        path: @application_json.path
      callbacks:
        success: ()=>
          @archives_to_extract--
        failure: ()=>
          @fail_with_message "Loading the app failed", "Could not extract all of the app archives. Please try again. If the problem persists, try restarting this application."

  handle_files: ()=>
    steroids.debug "Handling files..."

    for file in @application_json.files
      @send "downloadFile",
        parameters:
          filenameWithPath: "#{@application_json.path}/#{file.path}"
          url: file.url
        callbacks:
          success: ()=>
            @files_to_download--
          failure: ()=>
            @fail_with_message "Loading the app failed", "Could not start the application. Please try again. If the problem persists, try restarting this application."

  # complete boot process
  finish: ()=>
    steroids.debug "Finish"
    @is_finished = true
    @already_started = false

    localStorage.setItem "__appgyver_startpreview_previous_application_json", JSON.stringify(@application_json)

    @send "startApplication",
      parameters:
        application: @application_json
        server_host: URI(@json_url).hostname()
        server_port: ( @port || "80" )

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
      steroids.debug "EDGE: #{JSON.stringify(edge_json)} JSON.CONFIGURATION.CLIENT_VERSION: #{json.configuration.client_version}"
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
            if result.text.match(/^appgyver\:\/\//)
              @connect_by_link result.text
            else if result.text.match(/\:\/\//)
              @send "openURL",
                parameters:
                  url: result.text
            else
              @show_alert("Scan result", "You scanned: #{result.text}")

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

  run_noop: ()=>
    setInterval(()=>
      @send "noop"
    , 1000)

  # send client requests via websocket, this function takes care of callback returns (pass options.succcess & options.failure)
  send: (method, options={})=>
    steroids.debug "Sending websocket #{method} with options: #{options}"

    options.callbacks ||= {}
    options.parameters ||= {}

    steroids.nativeBridge.nativeCall
      method: method
      parameters: options.parameters
      successCallbacks: [options.callbacks.success]
      recurringCallbacks: [options.callbacks.recurring]
      failureCallbacks: [options.callbacks.failure]

window.boot = new BootLoader()
