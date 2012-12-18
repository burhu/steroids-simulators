(function() {
  var BootLoader,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  BootLoader = (function() {

    BootLoader.prototype.requiresAndroidSupport = typeof AndroidAPIBridge !== 'undefined';

    function BootLoader() {
      this.send = __bind(this.send, this);
      this.run_noop = __bind(this.run_noop, this);
      this.message_handler = __bind(this.message_handler, this);
      this.open_API_socket = __bind(this.open_API_socket, this);
      this.enable_view = __bind(this.enable_view, this);
      this.disable_view = __bind(this.disable_view, this);
      this.input_enable = __bind(this.input_enable, this);
      this.input_disable = __bind(this.input_disable, this);
      this.spinner_hide = __bind(this.spinner_hide, this);
      this.spinner_show = __bind(this.spinner_show, this);
      this.spinner = __bind(this.spinner, this);
      this.observe_ui = __bind(this.observe_ui, this);
      this.fail_without_message = __bind(this.fail_without_message, this);
      this.fail_with_message = __bind(this.fail_with_message, this);
      this.alert_about_different_mode = __bind(this.alert_about_different_mode, this);
      this.set_edge_mode = __bind(this.set_edge_mode, this);
      this.get_edge_mode = __bind(this.get_edge_mode, this);
      this.finish = __bind(this.finish, this);
      this.handle_files = __bind(this.handle_files, this);
      this.extract_archive = __bind(this.extract_archive, this);
      this.download_archive = __bind(this.download_archive, this);
      this.handle_archives = __bind(this.handle_archives, this);
      this.load = __bind(this.load, this);
      this.start = __bind(this.start, this);
      this.connect_to_localhost = __bind(this.connect_to_localhost, this);
      var _this = this;
      if (this.debug) console.log("constructor");
      this.observe_ui();
      if (this.requiresAndroidSupport) {
        AndroidAPIBridge.registerHandler("boot.message_handler");
      } else {
        this.open_API_socket();
      }
      window.onload = function() {
        if (window.location.href.search("first_time") !== -1) {
          return _this.connect_to_localhost();
        }
      };
      document.ontouchmove = function(e) {
        return e.preventDefault();
      };
    }

    BootLoader.prototype.debug = false;

    BootLoader.prototype.uid = 0;

    BootLoader.prototype.callbacks = {};

    BootLoader.prototype.files_to_download = null;

    BootLoader.prototype.archives_to_download = null;

    BootLoader.prototype.archives_to_extract = null;

    BootLoader.prototype.json_url = null;

    BootLoader.prototype.websocket = null;

    BootLoader.prototype.previousLink = localStorage.getItem("__appgyver_startpreview_previous_link");

    BootLoader.prototype.connect_to_localhost = function() {
      var _this = this;
      if (this.debug) console.log("Autoconnecting");
      return this.get_ip_address(function(ip) {
        if (_this.debug) console.log("getURL callback");
        _this.json_url = _this.local_url_for_ip(ip);
        return _this.start(_this.load);
      });
    };

    BootLoader.prototype.get_ip_address = function(callback) {
      var _this = this;
      return this.send("getIPAddress", {
        callbacks: {
          success: function(parameters) {
            if (_this.debug) {
              console.log("Received IP address: " + (JSON.stringify(parameters)));
            }
            return callback(parameters.ipAddress);
          },
          failure: function() {
            if (_this.debug) return console.log("Could not load endpoint URL.");
          }
        }
      });
    };

    BootLoader.prototype.connect_by_link = function(link) {
      var hash, id, ip_addresses,
        _this = this;
      progressbar.style.display = 'block';
      this.spinner_show();
      this.setPreviousLink(link);
      id = this.getParameterFromLinkByName(link, "id");
      if (id !== "") {
        hash = this.getParameterFromLinkByName(link, "hash");
        this.json_url = this.hash_url(id, hash);
        return this.start(this.load);
      } else {
        ip_addresses = JSON.parse(this.getParameterFromLinkByName(link, "ips"));
        return this.select_correct_ip(ip_addresses, function(ip_address) {
          _this.json_url = _this.local_url_for_ip(ip_address);
          return _this.start(_this.load);
        });
      }
    };

    BootLoader.prototype.setPreviousLink = function(link) {
      localStorage.setItem("__appgyver_startpreview_previous_link", link);
      return this.previousLink = link;
    };

    BootLoader.prototype.getParameterFromLinkByName = function(link, name) {
      var regex, regexS, results;
      name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
      regexS = "[\\?&]" + name + "=([^&#]*)";
      regex = new RegExp(regexS);
      results = regex.exec(URI(link).search());
      if (results === null) {
        return "";
      } else {
        return decodeURIComponent(results[1].replace(/\+/g, " "));
      }
    };

    BootLoader.prototype.select_correct_ip = function(ip_addresses, callback) {
      var _this = this;
      if (this.debug) {
        console.log("Got ip addresses: " + (JSON.stringify(ip_addresses)));
      }
      return this.get_ip_address(function(current_ip) {
        var block_regex, ip, _i, _j, _k, _len, _len2, _len3;
        if (_this.debug) console.log("Comparing to local ip: " + current_ip);
        block_regex = /^([0-9]+\.[0-9]+\.[0-9]+)\.[0-9]+$/;
        for (_i = 0, _len = ip_addresses.length; _i < _len; _i++) {
          ip = ip_addresses[_i];
          if (_this.debug) {
            console.log("comparing " + (ip.match(block_regex)[1]) + " to " + (current_ip.match(block_regex)[1]));
          }
          if (ip.match(block_regex)[1] === current_ip.match(block_regex)[1]) {
            callback(ip);
            return;
          }
        }
        block_regex = /^([0-9]+\.[0-9]+)\.[0-9]+\.[0-9]+$/;
        for (_j = 0, _len2 = ip_addresses.length; _j < _len2; _j++) {
          ip = ip_addresses[_j];
          if (_this.debug) {
            console.log("comparing " + (ip.match(block_regex)[1]) + " to " + (current_ip.match(block_regex)[1]));
          }
          if (ip.match(block_regex)[1] === current_ip.match(block_regex)[1]) {
            callback(ip);
            return;
          }
        }
        block_regex = /^([0-9]+)\.[0-9]+\.[0-9]+\.[0-9]+$/;
        for (_k = 0, _len3 = ip_addresses.length; _k < _len3; _k++) {
          ip = ip_addresses[_k];
          if (_this.debug) {
            console.log("comparing " + (ip.match(block_regex)[1]) + " to " + (current_ip.match(block_regex)[1]));
          }
          if (ip.match(block_regex)[1] === current_ip.match(block_regex)[1]) {
            callback(ip);
            return;
          }
        }
        if (_this.debug) console.log("Could not find matching IP");
        return callback("127.0.0.1");
      });
    };

    BootLoader.prototype.hash_url = function(id, hash) {
      return "http://livepreview.appgyver.com/appgyver/api/applications/" + id + ".json?hash=" + hash;
    };

    BootLoader.prototype.local_url_for_ip = function(ip) {
      return "http://" + ip + ":4567/appgyver/api/applications/1.json";
    };

    BootLoader.prototype.start = function(callback) {
      var _this = this;
      this.archives_to_extract = null;
      this.files_to_download = null;
      if (!this.already_started) {
        this.already_started = true;
        progressbar.style.display = 'block';
        return this.send("wipeDevice", {
          callbacks: {
            success: function() {
              var xhr;
              _this.is_finished = false;
              return xhr = new XHR(_this.json_url, {
                success: function(json) {
                  return _this.alert_about_different_mode(json, function() {
                    if (_this.debug) {
                      console.log("Client and Studio have same client mode, yay");
                    }
                    if (_this.debug) console.log("" + (JSON.stringify(json)));
                    if (json.bottom_bars.length === 0 && json.configuration.fullscreen === "false") {
                      return _this.fail_with_message("Loading the app failed", "No tab bars in a non-fullscreen project. Fix this by switching your project to fullscreen or adding some tabs, and then connecting again.");
                    } else {
                      _this.application_json = json;
                      if (callback != null) return callback.call();
                    }
                  });
                },
                failure: function(status, response) {
                  if (URI(_this.json_url).hostname() === "livepreview.appgyver.com") {
                    return _this.fail_with_message("Connection error", "Could not open a connection between AppGyver Cloud and the Preview app. Please ensure that your app ID and PIN are correct. If the problem persists, try restarting the Preview app.");
                  } else {
                    return _this.fail_with_message("Connection error", "Could not open a connection between AppGyver Studio and the Preview app. Please check that both are in the same network. If the problem persists, try restarting the Preview app and/or AppGyver Studio.");
                  }
                }
              });
            }
          }
        });
      } else {
        if (this.debug) return console.log("User double-tapped, prevented this!");
      }
    };

    BootLoader.prototype.load = function() {
      var _this = this;
      if (this.debug) console.log("Loading the application...");
      this.archives_to_extract = this.application_json.archives.length;
      this.archives_to_download = this.application_json.archives.length;
      this.files_to_download = this.application_json.files.length;
      this.total_files = this.application_json.files.length + this.application_json.archives.length;
      this.handle_archives();
      this.handle_files();
      return this.finish_interval = setInterval(function() {
        if ((((_this.files_to_download != null) && _this.files_to_download === 0) || !(_this.files_to_download != null)) && (((_this.archives_to_download != null) && _this.archives_to_download === 0) || !(_this.archives_to_download != null)) && (((_this.archives_to_extract != null) && _this.archives_to_extract === 0) || !(_this.archives_to_extract != null))) {
          clearInterval(_this.finish_interval);
          return _this.finish();
        }
      }, 50);
    };

    BootLoader.prototype.handle_archives = function() {
      var archive, _i, _len, _ref, _results;
      if (this.debug) console.log("Composing an array of archives to download...");
      _ref = this.application_json.archives;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        archive = _ref[_i];
        if (archive.url != null) _results.push(this.download_archive(archive));
      }
      return _results;
    };

    BootLoader.prototype.download_archive = function(archive) {
      var my_uid, name,
        _this = this;
      if (this.debug) console.log("Handling the app archives...");
      my_uid = this.uid++;
      name = "archive_" + my_uid;
      return this.send("downloadFile", {
        parameters: {
          filenameWithPath: name,
          url: archive.url
        },
        callbacks: {
          recurring: function(params) {
            downloaded.innerHTML = params.downloaded;
            size.innerHTML = params.size;
            percentage.innerHTML = Math.round(params.downloaded * 100 / params.size);
            return progressinner.style.width = Math.round(params.downloaded * 100 / params.size) + '%';
          },
          success: function() {
            _this.extract_archive(name);
            return _this.archives_to_download--;
          },
          failure: function() {
            var key, val, _len, _ref;
            _ref = _this.callbacks;
            for (val = 0, _len = _ref.length; val < _len; val++) {
              key = _ref[val];
              delete _this.callbacks[key];
            }
            return _this.fail_with_message("Loading the app failed", "Could not download all of the app archives. Please try again. If the problem persists, try restarting the Preview app.");
          }
        }
      });
    };

    BootLoader.prototype.extract_archive = function(name) {
      var _this = this;
      if (this.debug) console.log("Extracting app archive...");
      return this.send("unzip", {
        parameters: {
          filenameWithPath: name,
          path: "Application"
        },
        callbacks: {
          success: function() {
            return _this.archives_to_extract--;
          },
          failure: function() {
            return _this.fail_with_message("Loading the app failed", "Could not extract all of the app archives. Please try again. If the problem persists, try restarting the Preview app.");
          }
        }
      });
    };

    BootLoader.prototype.handle_files = function() {
      var file, _i, _len, _ref, _results,
        _this = this;
      if (this.debug) console.log("Handling files...");
      _ref = this.application_json.files;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        file = _ref[_i];
        _results.push(this.send("downloadFile", {
          parameters: {
            filenameWithPath: file.path,
            url: file.url
          },
          callbacks: {
            success: function() {
              return _this.files_to_download--;
            },
            failure: function() {
              return _this.fail_with_message("Loading the app failed", "Could not download all of the app files. Please try again. If the problem persists, try restarting the Preview app.");
            }
          }
        }));
      }
      return _results;
    };

    BootLoader.prototype.finish = function() {
      if (this.debug) console.log("Finish");
      this.is_finished = true;
      this.already_started = false;
      this.send("startApplication", {
        parameters: {
          id: this.application_json.id,
          name: this.application_json.name,
          server_host: URI(this.json_url).hostname(),
          server_port: URI(this.json_url).port() || "80",
          bottom_bars: this.application_json.bottom_bars,
          configuration: this.application_json.configuration,
          authentication: this.application_json.authentication,
          update: this.application_json.update
        }
      });
      return this.spinner_hide();
    };

    BootLoader.prototype.get_edge_mode = function(cb) {
      return this.send("getEdgeMode", {
        callbacks: {
          success: cb
        }
      });
    };

    BootLoader.prototype.set_edge_mode = function(bool, cb) {
      return this.send("setEdgeMode", {
        parameters: {
          edgeMode: (bool ? 1 : 0)
        },
        callbacks: {
          success: cb
        }
      });
    };

    BootLoader.prototype.alert_about_different_mode = function(json, cb) {
      var _this = this;
      return this.get_edge_mode(function(edge_json) {
        if (_this.debug) {
          console.log("EDGE: " + (JSON.stringify(edge_json)) + " JSON.CONFIGURATION.CLIENT_VERSION: " + json.configuration.client_version);
        }
        if (edge_json.edgeMode === "true" && json.configuration.client_version !== "edge") {
          return _this.fail_with_message("Project in legacy mode", "The project you are trying to preview is a legacy project. Go to http://www.appgyver.com/legacy for upgrade instructions.");
        } else {
          if ((cb != null) && typeof cb === "function") return cb.call();
        }
      });
    };

    BootLoader.prototype.fail_with_message = function(title, message) {
      this.fail_without_message();
      return this.show_alert(title, message);
    };

    BootLoader.prototype.fail_without_message = function() {
      if (this.already_started) this.already_started = false;
      previous_qr_code.className = "reopen_image disableable";
      progressinner.style.width = '0%';
      progressbar.style.display = 'none';
      if (this.finish_interval != null) clearInterval(this.finish_interval);
      this.files_to_download = 0;
      this.archives_to_extract = 0;
      this.send("cancelAllDownloads");
      return this.spinner_hide();
    };

    BootLoader.prototype.show_alert = function(title, message) {
      return this.send("alert", {
        parameters: {
          title: title,
          message: message
        }
      });
    };

    BootLoader.prototype.observe_ui = function() {
      var _this = this;
      return document.addEventListener("DOMContentLoaded", function() {
        scan_qr_code.addEventListener("touchstart", function() {
          return scan_qr_code.className = "scan_image scan_image_hover disableable";
        });
        scan_qr_code.addEventListener("touchend", function() {
          return window.plugins.barcodeScanner.scan(function(result) {
            scan_qr_code.className = "scan_image disableable";
            if (!result.cancelled) return _this.connect_by_link(result.text);
          });
        });
        previous_qr_code.addEventListener("touchstart", function() {
          if (_this.previousLink) {
            previous_qr_code.className = "reopen_image reopen_image_hover disableable";
            return _this.connect_by_link(_this.previousLink);
          } else {
            return _this.fail_with_message("No QR codes in memory", "No QR codes scanned yet. Use the scan button to scan a QR code.");
          }
        });
        cancel_download.addEventListener("touchstart", function() {
          return _this.fail_without_message();
        });
        _this.spinner();
        return _this.spinner_hide();
      });
    };

    BootLoader.prototype.spinner = function() {
      var opts, spinner;
      opts = {
        lines: 12,
        length: 3,
        width: 2,
        radius: 4,
        color: '#000',
        speed: 1,
        trail: 60,
        shadow: false,
        hwaccel: true
      };
      this.spinner_element = document.querySelector('#spinner');
      return spinner = new Spinner(opts).spin(this.spinner_element);
    };

    BootLoader.prototype.spinner_show = function() {
      this.spinner_element.style.display = "-webkit-box";
      return this.input_disable();
    };

    BootLoader.prototype.spinner_hide = function() {
      this.spinner_element.style.display = "none";
      return this.input_enable();
    };

    BootLoader.prototype.input_disable = function() {
      var element, _i, _len, _ref, _results;
      _ref = document.querySelectorAll(".disableable");
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        element = _ref[_i];
        _results.push(element.disabled = "disabled");
      }
      return _results;
    };

    BootLoader.prototype.input_enable = function() {
      var element, _i, _len, _ref, _results;
      _ref = document.querySelectorAll(".disableable");
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        element = _ref[_i];
        _results.push(element.disabled = "");
      }
      return _results;
    };

    BootLoader.prototype.disable_view = function(title, message) {
      var code, div, h1, p1, p2, p3,
        _this = this;
      div = document.createElement("div");
      div.setAttribute("id", "disabler");
      h1 = document.createElement("h1");
      h1.textContent = title;
      div.appendChild(h1);
      p1 = document.createElement("p");
      p1.textContent = message;
      div.appendChild(p1);
      p2 = document.createElement("p");
      p2.textContent = "For your troubles, here is a cheerful ASCII character throwing sparkles:";
      div.appendChild(p2);
      p3 = document.createElement("p");
      code = document.createElement("code");
      code.textContent = "(ﾉ^ヮ^)ﾉ*:･ﾟ✧";
      p3.appendChild(code);
      div.appendChild(p3);
      document.querySelector("body").appendChild(div);
      this.spinner_element.style.display = "none";
      this.is_finished = true;
      div.ontouchmove(function(e) {
        return e.preventDefault;
      });
      if (this.finish_interval != null) return clearInterval(this.finish_interval);
    };

    BootLoader.prototype.enable_view = function() {
      return disabler.parentNode.removeChild(disabler);
    };

    BootLoader.prototype.open_API_socket = function() {
      this.websocket = new WebSocket("ws://localhost:31337");
      this.websocket.onmessage = this.message_handler;
      this.websocket.onopen = this.run_noop;
      this.websocket.onclose = this.open_API_socket;
      if (this.debug) return console.log("Websocket opened");
    };

    BootLoader.prototype.message_handler = function(e) {
      var data;
      if (this.requiresAndroidSupport) {
        if (this.debug) console.log("Received message " + e);
        if (e) {
          data = JSON.parse(e);
        } else {
          data = e;
        }
      } else {
        if (this.debug) console.log("Received message " + e.data);
        data = JSON.parse(e.data);
      }
      if ((data != null ? data.callback : void 0) != null) {
        if (this.debug) console.log("Websocket responded with callback");
        if (this.callbacks[data.callback] != null) {
          if (this.debug) {
            console.log("Running callback " + data.callback + " with parameters: " + (JSON.stringify(data.parameters)));
          }
          return this.callbacks[data.callback].call(data.parameters, data.parameters);
        }
      }
    };

    BootLoader.prototype.run_noop = function() {
      var _this = this;
      return setInterval(function() {
        return _this.send("noop");
      }, 1000);
    };

    BootLoader.prototype.send = function(method, options) {
      var callback_name, callbacks, request,
        _this = this;
      if (this.debug) console.log("Sending websocket " + method);
      if ((options != null ? options.callbacks : void 0) != null) {
        if (this.debug) console.log("Preparing callbacks");
        callback_name = "" + method + "_" + (this.uid++);
        callbacks = {
          success: "" + callback_name + "_success",
          failure: "" + callback_name + "_fail",
          recurring: "" + callback_name + "_recurring"
        };
        if (this.debug) console.log("Success!");
        if (options.callbacks.success != null) {
          this.callbacks[callbacks.success] = function(parameters) {
            if (_this.debug) {
              console.log("Running callback success with parameters " + (JSON.stringify(parameters)));
            }
            delete _this.callbacks[callbacks.success];
            delete _this.callbacks[callbacks.failure];
            return options.callbacks.success.call(parameters, parameters);
          };
        }
        if (options.callbacks.recurring != null) {
          this.callbacks[callbacks.recurring] = function(parameters) {
            if (_this.debug) {
              console.log("Running callback recurring with parameters " + (JSON.stringify(parameters)));
            }
            return options.callbacks.recurring.call(parameters, parameters);
          };
        }
        if (this.debug) console.log("Failure!");
        if (options.callbacks.failure != null) {
          this.callbacks[callbacks.failure] = function(parameters) {
            if (_this.debug) {
              console.log("Running callback failure with parameters " + (JSON.stringify(parameters)));
            }
            delete _this.callbacks[callbacks.success];
            delete _this.callbacks[callbacks.failure];
            return options.callbacks.failure.call(parameters, parameters);
          };
        }
      } else {
        callbacks = {};
      }
      if (this.debug) console.log("Generating request JSON");
      request = JSON.stringify({
        method: method,
        parameters: (options != null ? options.parameters : void 0) != null ? options.parameters : {},
        callbacks: callbacks
      });
      if (this.debug) console.log("Sending request: " + request);
      if (this.requiresAndroidSupport) {
        return AndroidAPIBridge.send(request);
      } else {
        if (this.websocket.readyState === 0) {
          return this.websocket.addEventListener("open", function() {
            return _this.websocket.send(request);
          });
        } else {
          return this.websocket.send(request);
        }
      }
    };

    return BootLoader;

  })();

  window.boot = new BootLoader();

}).call(this);
