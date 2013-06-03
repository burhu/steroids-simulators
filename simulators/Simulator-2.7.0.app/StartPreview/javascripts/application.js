(function() {
  var BootLoader,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  BootLoader = (function() {

    function BootLoader() {
      this.send = __bind(this.send, this);
      this.run_noop = __bind(this.run_noop, this);
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
      steroids.debug("constructor");
      this.observe_ui();
      window.onload = function() {
        if (window.location.href.search("simulator_start") !== -1) {
          _this.connect_to_localhost();
        } else {
          if (window.location.href.search("initial_start") !== -1) {
            if (_this.previousApplicationJSONString != null) {
              _this.reopenApplicationFromDisk();
            }
          }
        }
        return $("body").animate({
          opacity: 100
        });
      };
      document.ontouchmove = function(e) {
        return e.preventDefault();
      };
    }

    BootLoader.prototype.files_to_download = null;

    BootLoader.prototype.archives_to_download = null;

    BootLoader.prototype.archives_to_extract = null;

    BootLoader.prototype.json_url = null;

    BootLoader.prototype.websocket = null;

    BootLoader.prototype.previousLink = localStorage.getItem("__appgyver_startpreview_previous_link");

    BootLoader.prototype.previousApplicationJSONString = localStorage.getItem("__appgyver_startpreview_previous_application_json");

    BootLoader.prototype.port = "4567";

    BootLoader.prototype.connect_to_localhost = function() {
      var _this = this;
      steroids.debug("Autoconnecting");
      return this.get_ip_address(function(ip) {
        steroids.debug("getURL callback");
        _this.json_url = _this.local_url_for_ip(ip);
        return _this.start(_this.load);
      });
    };

    BootLoader.prototype.get_ip_address = function(callback) {
      var _this = this;
      return this.send("getIPAddress", {
        callbacks: {
          success: function(parameters) {
            steroids.debug("Received IP address: " + (JSON.stringify(parameters)));
            return callback(parameters.ipAddress);
          },
          failure: function() {
            return steroids.debug("Could not load endpoint URL.");
          }
        }
      });
    };

    BootLoader.prototype.reopenApplicationFromDisk = function() {
      var hash, id, ip_addresses, link,
        _this = this;
      progressbar.style.display = 'block';
      this.spinner_show();
      link = this.previousLink;
      this.application_json = JSON.parse(this.previousApplicationJSONString);
      id = this.getParameterFromLinkByName(link, "id");
      if (id !== "") {
        hash = this.getParameterFromLinkByName(link, "hash");
        this.json_url = this.hash_url(id, hash);
        return this.alert_about_different_mode(this.application_json, function() {
          steroids.debug("Client and Studio have same client mode, yay");
          steroids.debug("" + (JSON.stringify(_this.application_json)));
          if (_this.application_json.bottom_bars.length === 0 && _this.application_json.configuration.fullscreen === "false") {
            return _this.fail_with_message("Loading the app failed", "No tab bars in a non-fullscreen project. Fix this by switching your project to fullscreen or adding some tabs, and then connecting again.");
          } else {
            return _this.finish();
          }
        });
      } else {
        ip_addresses = JSON.parse(this.getParameterFromLinkByName(link, "ips"));
        this.port = this.getParameterFromLinkByName(link, "port");
        steroids.debug("Parsed port: " + this.port);
        if (!(this.port != null) || (this.port === "")) {
          steroids.debug("Setting port to default 4567");
          this.port = "4567";
        }
        return this.select_correct_ip(ip_addresses, function(ip_address) {
          _this.json_url = _this.local_url_for_ip(ip_address);
          return _this.alert_about_different_mode(_this.application_json, function() {
            steroids.debug("Client and Studio have same client mode, yay");
            steroids.debug("" + (JSON.stringify(_this.application_json)));
            if (_this.application_json.bottom_bars.length === 0 && _this.application_json.configuration.fullscreen === "false") {
              return _this.fail_with_message("Loading the app failed", "No tab bars in a non-fullscreen project. Fix this by switching your project to fullscreen or adding some tabs, and then connecting again.");
            } else {
              return _this.finish();
            }
          });
        });
      }
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
        this.port = this.getParameterFromLinkByName(link, "port");
        steroids.debug("Parsed port: " + this.port);
        if (!(this.port != null) || (this.port === "")) {
          steroids.debug("Setting port to default 4567");
          this.port = "4567";
        }
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
      steroids.debug("Got ip addresses: " + (JSON.stringify(ip_addresses)));
      return this.get_ip_address(function(current_ip) {
        var block_regex, ip, _i, _j, _k, _len, _len2, _len3;
        steroids.debug("Comparing to local ip: " + current_ip);
        block_regex = /^([0-9]+\.[0-9]+\.[0-9]+)\.[0-9]+$/;
        for (_i = 0, _len = ip_addresses.length; _i < _len; _i++) {
          ip = ip_addresses[_i];
          steroids.debug("comparing " + (ip.match(block_regex)[1]) + " to " + (current_ip.match(block_regex)[1]));
          if (ip.match(block_regex)[1] === current_ip.match(block_regex)[1]) {
            callback(ip);
            return;
          }
        }
        block_regex = /^([0-9]+\.[0-9]+)\.[0-9]+\.[0-9]+$/;
        for (_j = 0, _len2 = ip_addresses.length; _j < _len2; _j++) {
          ip = ip_addresses[_j];
          steroids.debug("comparing " + (ip.match(block_regex)[1]) + " to " + (current_ip.match(block_regex)[1]));
          if (ip.match(block_regex)[1] === current_ip.match(block_regex)[1]) {
            callback(ip);
            return;
          }
        }
        block_regex = /^([0-9]+)\.[0-9]+\.[0-9]+\.[0-9]+$/;
        for (_k = 0, _len3 = ip_addresses.length; _k < _len3; _k++) {
          ip = ip_addresses[_k];
          steroids.debug("comparing " + (ip.match(block_regex)[1]) + " to " + (current_ip.match(block_regex)[1]));
          if (ip.match(block_regex)[1] === current_ip.match(block_regex)[1]) {
            callback(ip);
            return;
          }
        }
        steroids.debug("Could not find matching IP");
        return callback("127.0.0.1");
      });
    };

    BootLoader.prototype.hash_url = function(id, hash) {
      return "http://livepreview.appgyver.com/appgyver/api/applications/" + id + ".json?hash=" + hash + "&client_version=" + window.AG_CLIENT_VERSION;
    };

    BootLoader.prototype.local_url_for_ip = function(ip) {
      return "http://" + ip + ":" + (this.port || 4567) + "/appgyver/api/applications/1.json?client_version=" + window.AG_CLIENT_VERSION;
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
              steroids.debug("Connecting to: " + _this.json_url);
              return xhr = new XHR(_this.json_url, {
                success: function(json) {
                  return _this.alert_about_different_mode(json, function() {
                    steroids.debug("Client and Studio have same client mode, yay");
                    steroids.debug("" + (JSON.stringify(json)));
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
                    return _this.fail_with_message("Connection error", "Could not open a connection to AppGyver Cloud. Please check your Internet connectivity.");
                  } else {
                    return _this.fail_with_message("Connection error", "Could not open a connection to your development environment.  Please check that both are in the same network.  You may also try to restart this application and your development environment.");
                  }
                }
              });
            }
          }
        });
      } else {
        return steroids.debug("User double-tapped, prevented this!");
      }
    };

    BootLoader.prototype.load = function() {
      var _this = this;
      steroids.debug("Loading the application...");
      if (this.application_json.build_timestamp) {
        this.application_json.path = "applications/local/" + this.application_json.build_timestamp;
      } else {
        this.application_json.path = "applications/cloud/" + (Math.round(new Date().getTime() / 1000));
      }
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
      steroids.debug("Composing an array of archives to download...");
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
      steroids.debug("Handling the app archives...");
      my_uid = this.uid++;
      name = "" + this.application_json.path + "/__appgyver/archives/archive_" + my_uid;
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
            return _this.fail_with_message("Loading the app failed", "Could not download all of the app archives. Please try again. If the problem persists, try restarting this application.");
          }
        }
      });
    };

    BootLoader.prototype.extract_archive = function(name) {
      var _this = this;
      steroids.debug("Extracting app archive...");
      return this.send("unzip", {
        parameters: {
          filenameWithPath: name,
          path: this.application_json.path
        },
        callbacks: {
          success: function() {
            return _this.archives_to_extract--;
          },
          failure: function() {
            return _this.fail_with_message("Loading the app failed", "Could not extract all of the app archives. Please try again. If the problem persists, try restarting this application.");
          }
        }
      });
    };

    BootLoader.prototype.handle_files = function() {
      var file, _i, _len, _ref, _results,
        _this = this;
      steroids.debug("Handling files...");
      _ref = this.application_json.files;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        file = _ref[_i];
        _results.push(this.send("downloadFile", {
          parameters: {
            filenameWithPath: "" + this.application_json.path + "/" + file.path,
            url: file.url
          },
          callbacks: {
            success: function() {
              return _this.files_to_download--;
            },
            failure: function() {
              return _this.fail_with_message("Loading the app failed", "Could not start the application. Please try again. If the problem persists, try restarting this application.");
            }
          }
        }));
      }
      return _results;
    };

    BootLoader.prototype.finish = function() {
      steroids.debug("Finish");
      this.is_finished = true;
      this.already_started = false;
      localStorage.setItem("__appgyver_startpreview_previous_application_json", JSON.stringify(this.application_json));
      this.send("startApplication", {
        parameters: {
          application: this.application_json,
          server_host: URI(this.json_url).hostname(),
          server_port: this.port || "80"
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
        steroids.debug("EDGE: " + (JSON.stringify(edge_json)) + " JSON.CONFIGURATION.CLIENT_VERSION: " + json.configuration.client_version);
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
      reopen.className = "reopen_image disableable";
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
            if (!result.cancelled) {
              if (result.text.match(/^appgyver\:\/\//)) {
                return _this.connect_by_link(result.text);
              } else if (result.text.match(/\:\/\//)) {
                return _this.send("openURL", {
                  parameters: {
                    url: result.text
                  }
                });
              } else {
                return _this.show_alert("Scan result", "You scanned: " + result.text);
              }
            }
          });
        });
        reload.addEventListener("touchstart", function() {
          if (_this.previousLink) {
            reload.className = "reload_image reload_image_hover disableable";
            return _this.connect_by_link(_this.previousLink);
          } else {
            return _this.fail_with_message("No QR codes in memory", "No QR codes scanned yet. Use the scan button to scan a QR code.");
          }
        });
        reopen.addEventListener("touchstart", function() {
          if (_this.previousApplicationJSONString) {
            reopen.className = "reopen_image reopen_image_hover disableable";
            return _this.reopenApplicationFromDisk();
          } else {
            return _this.fail_with_message("No application in memory", "No applications stored in memory yet. Use the scan button to scan a QR code.");
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

    BootLoader.prototype.run_noop = function() {
      var _this = this;
      return setInterval(function() {
        return _this.send("noop");
      }, 1000);
    };

    BootLoader.prototype.send = function(method, options) {
      if (options == null) options = {};
      steroids.debug("Sending websocket " + method + " with options: " + options);
      options.callbacks || (options.callbacks = {});
      options.parameters || (options.parameters = {});
      return steroids.nativeBridge.nativeCall({
        method: method,
        parameters: options.parameters,
        successCallbacks: [options.callbacks.success],
        recurringCallbacks: [options.callbacks.recurring],
        failureCallbacks: [options.callbacks.failure]
      });
    };

    return BootLoader;

  })();

  window.boot = new BootLoader();

}).call(this);
