
/*
  Studio.js takes care of refresh
*/

(function() {
  var CloudPreview,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  window.Studio = (function() {

    Studio.prototype.requiresAndroidSupport = typeof AndroidAPIBridge !== 'undefined';

    function Studio() {
      this.alert_about_different_mode = __bind(this.alert_about_different_mode, this);
      this.spinner_hide = __bind(this.spinner_hide, this);
      this.spinner_show = __bind(this.spinner_show, this);
      this.spinner = __bind(this.spinner, this);
      this.set_edge_mode = __bind(this.set_edge_mode, this);
      this.get_edge_mode = __bind(this.get_edge_mode, this);
      this.finish = __bind(this.finish, this);
      this.fail_with_retry_message = __bind(this.fail_with_retry_message, this);
      this.handle_files = __bind(this.handle_files, this);
      this.extract_archive = __bind(this.extract_archive, this);
      this.download_archive = __bind(this.download_archive, this);
      this.handle_archives = __bind(this.handle_archives, this);
      this.load = __bind(this.load, this);
      this.get_application_json = __bind(this.get_application_json, this);
      this.start = __bind(this.start, this);
      this.start_and_load = __bind(this.start_and_load, this);
      this.url = __bind(this.url, this);
      this.send = __bind(this.send, this);
      this.message_handler = __bind(this.message_handler, this);
      this.observe_ui = __bind(this.observe_ui, this);
      this.poll_studio_for_refresh = __bind(this.poll_studio_for_refresh, this);
      this.get_end_point_url = __bind(this.get_end_point_url, this);
      this.listen_shake = __bind(this.listen_shake, this);
      this.reopen = __bind(this.reopen, this);
      this.run_noop = __bind(this.run_noop, this);
      this.on_open_handler = __bind(this.on_open_handler, this);
      this.android_boot = __bind(this.android_boot, this);
      var _this = this;
      if (this.debug) console.log("Constructing Studio");
      this.observe_ui();
      if (this.requiresAndroidSupport) {
        if (this.debug) console.log("Setting up Android communication...");
        AndroidAPIBridge.registerHandler("studio.message_handler");
        this.android_boot();
      } else {
        this.reopen();
      }
      document.ontouchmove = function(e) {
        return e.preventDefault();
      };
    }

    Studio.prototype.debug = false;

    Studio.prototype.uid = 0;

    Studio.prototype.callbacks = {};

    Studio.prototype.archives_to_extract = null;

    Studio.prototype.files_to_download = null;

    Studio.prototype.endpoint_url = null;

    Studio.prototype.json_url = null;

    Studio.prototype.host = null;

    Studio.prototype.port = null;

    Studio.prototype.websocket = null;

    Studio.prototype.android_boot = function() {
      var _this = this;
      return this.get_end_point_url(function() {
        if (_this.debug) console.log("Endpoint url: %{@host}:%{port}");
        if (_this.host === "livepreview.appgyver.com") return;
        return _this.get_application_json(true, function(json) {
          _this.application_json = json;
          return _this.poll_studio_for_refresh(function() {
            return _this.start_and_load();
          });
        }, function(status, response) {});
      });
    };

    Studio.prototype.on_open_handler = function() {
      var _this = this;
      this.run_noop();
      return this.get_end_point_url(function() {
        if (_this.debug) console.log("Got endpoint url");
        _this.listen_shake();
        if (_this.host !== "livepreview.appgyver.com") {
          if (_this.debug) {
            console.log("Getting application.json (for run specific settings)...");
          }
          return _this.get_application_json(true, function(json) {
            _this.application_json = json;
            return _this.poll_studio_for_refresh(function() {
              return _this.start_and_load();
            });
          }, function(status, response) {});
        }
      });
    };

    Studio.prototype.run_noop = function() {
      var _this = this;
      return setInterval(function() {
        return _this.send("noop");
      }, 1000);
    };

    Studio.prototype.reopen = function() {
      var xmlhttp,
        _this = this;
      xmlhttp = new XMLHttpRequest();
      xmlhttp.onreadystatechange = function() {
        if (xmlhttp.readyState === 4) {
          _this.websocket = new WebSocket("ws://localhost:" + xmlhttp.responseText);
          _this.websocket.onmessage = _this.message_handler;
          _this.websocket.onopen = _this.on_open_handler;
          return _this.websocket.onclose = _this.reopen;
        }
      };
      xmlhttp.open("GET", "http://dolans.inetrnul.do.nut.cunnoct.localhost/");
      return xmlhttp.send();
    };

    Studio.prototype.listen_shake = function() {
      var _this = this;
      return window.deviceShakenByUser = function() {
        return _this.send("showApplicationSelection");
      };
    };

    Studio.prototype.get_end_point_url = function(callback) {
      var _this = this;
      return this.send("getEndpointURL", {
        callbacks: {
          success: function(parameters) {
            if (/livepreview\.appgyver\.com/.test(parameters.endpointURL)) {
              _this.host = "livepreview.appgyver.com";
              return callback.call(_this, _this);
            } else {
              if (_this.debug) {
                console.log("Received Endpoint URL: " + (JSON.stringify(parameters)));
              }
              _this.host = parameters.endpointURL.match(/(.*):(\d*)/)[1];
              _this.port = parameters.endpointURL.match(/(.*):(\d*)/)[2];
              _this.json_url = "http://" + _this.host + ":" + _this.port + "/appgyver/api/applications/1.json";
              if (_this.debug) {
                console.log("Parsed endpoint to: host: " + _this.host + ", port: " + _this.port + ", json_url: " + _this.json_url);
              }
              return callback.call(_this, _this);
            }
          },
          failure: function() {
            if (_this.debug) return console.log("Could not load Endpoint URL.");
          }
        }
      });
    };

    Studio.prototype.poll_studio_for_refresh = function(callback) {
      var refresh_url,
        _this = this;
      if (this.refresh_poller != null) clearInterval(this.refresh_poller);
      if (this.debug) console.log("Start polling studio for refresh trigger");
      refresh_url = "http://" + this.host + ":" + this.port + "/refresh_client?" + this.application_json.build_timestamp;
      if (this.debug) console.log("Refresh url is: " + refresh_url);
      return this.refresh_poller = setInterval(function() {
        var xhr;
        return xhr = new XHR(refresh_url, {
          success: function(response) {
            if (response) {
              window.clearInterval(_this.refresh_poller);
              return callback.call();
            }
          },
          failure: function() {
            if (_this.debug) {
              return console.log("Studio refresh trigger responsed failed.");
            }
          }
        });
      }, 1000);
    };

    Studio.prototype.observe_ui = function() {
      var _this = this;
      return document.addEventListener("DOMContentLoaded", function() {
        back_to_scanner.addEventListener("touchstart", function() {
          _this.send("cancelAllDownloads");
          return _this.send("showApplicationSelection");
        });
        _this.spinner();
        return _this.spinner_hide();
      });
    };

    Studio.prototype.message_handler = function(e) {
      var data;
      if (this.requiresAndroidSupport) {
        if (this.debug) console.log("Received message " + e);
        if (e !== null) {
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

    Studio.prototype.send = function(method, options) {
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

    Studio.prototype.url = function() {
      if (arguments.length === 1) {
        this.host = arguments[0];
        this.port = 4567;
        localStorage.setItem("ip", arguments[0]);
        return "http://" + arguments[0] + ":4567/appgyver/api/applications/1.json";
      }
    };

    Studio.prototype.start_and_load = function() {
      if (!this.already_starting) {
        this.already_starting = true;
        return this.start(this.load);
      } else {
        if (this.debug) return console.log("doublestart!");
      }
    };

    Studio.prototype.start = function(callback) {
      var _this = this;
      this.archives_to_extract = null;
      this.files_to_download = null;
      this.is_finished = false;
      progressbar.style.display = 'block';
      this.spinner_show();
      this.send("showBackgroundWebView");
      this.get_application_json(false, function(json) {
        _this.keep_data = json.keep_data;
        return _this.alert_about_different_mode(json, function() {
          if (_this.debug) console.log("success");
          if (_this.debug) console.log("" + (JSON.stringify(json)));
          if (json.bottom_bars.length === 0 && json.configuration.fullscreen === "false") {
            return _this.fail_with_retry_message("Your non-full-screen project has no tab bar buttons and thus could not be loaded. To fix this, go to AppGyver Studio and add a tab bar button, or switch your project to full-screen mode. Would you like to try again?");
          } else {
            _this.application_json = json;
            if (callback != null) return callback.call();
          }
        });
      }, function(status, response) {
        return _this.fail_with_retry_message("Could not open a connection between AppGyver Studio and your Preview app. Try again?", callback);
      });
      return this.start_timeout = setTimeout(function() {
        if (_this.selected_tab === "local" && !_this.is_finished) {
          return _this.fail_with_retry_message("Loading your project failed: establish a connection with AppGyver Studio timed out. Would you like to try again?", callback);
        }
      }, 10000);
    };

    Studio.prototype.get_application_json = function(invisible_request, success, failure) {
      var url, xhr;
      url = this.json_url;
      if (invisible_request) url += '?invisible';
      return xhr = new XHR(url, {
        success: success,
        failure: failure
      });
    };

    Studio.prototype.load = function() {
      var _this = this;
      if (this.debug) console.log("Loading application...");
      if (this.application_json.build_timestamp) {
        this.application_json.path = "applications/local/" + this.application_json.build_timestamp;
      } else {
        this.application_json.path = "applications/cloud/" + (Math.round(new Date().getTime() / 1000));
      }
      this.handle_archives();
      this.handle_files();
      return this.finish_interval = setInterval(function() {
        if (((_this.files_to_download != null) && _this.files_to_download === 0) || !(_this.files_to_download != null)) {
          if (((_this.archives_to_extract != null) && _this.archives_to_extract === 0) || !(_this.archives_to_extract != null)) {
            clearInterval(_this.finish_interval);
            return _this.finish();
          }
        }
      }, 50);
    };

    Studio.prototype.handle_archives = function() {
      var archive, _i, _len, _ref, _results;
      if (this.debug) console.log("Handling archives...");
      this.archives_to_extract = this.application_json.archives.length;
      _ref = this.application_json.archives;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        archive = _ref[_i];
        if (archive.url != null) _results.push(this.download_archive(archive));
      }
      return _results;
    };

    Studio.prototype.download_archive = function(archive) {
      var my_uid, name,
        _this = this;
      if (this.debug) console.log("downloading archive..");
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
            rate.innerHTML = params.rate;
            return progressinner.style.width = Math.round(params.downloaded * 100 / params.size) + '%';
          },
          success: function() {
            return _this.extract_archive(name);
          },
          failure: function() {
            var key, val, _len, _ref;
            _ref = _this.callbacks;
            for (val = 0, _len = _ref.length; val < _len; val++) {
              key = _ref[val];
              delete _this.callbacks[key];
            }
            return _this.fail_with_retry_message("Loading your application failed due to a network download issue. Would you like to try again?");
          }
        }
      });
    };

    Studio.prototype.extract_archive = function(name) {
      var _this = this;
      if (this.debug) console.log("extracting archive..");
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
            return _this.fail_with_retry_message("Loading your application failed due to an issue with extracting the app archive. Would you like to try again?");
          }
        }
      });
    };

    Studio.prototype.handle_files = function() {
      var file, _i, _len, _ref, _results,
        _this = this;
      if (this.debug) console.log("handling files..");
      this.files_to_download = this.application_json.files.length;
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
              return _this.fail_with_retry_message("Loading your application failed due to a network download issue. Would you like to try again?");
            }
          }
        }));
      }
      return _results;
    };

    Studio.prototype.fail_with_retry_message = function(message) {
      var con;
      if (this.finish_interval != null) clearInterval(this.finish_interval);
      this.already_starting = false;
      this.files_to_download = 0;
      this.archives_to_extract = 0;
      con = confirm(message);
      if (con) {
        return this.start(this.load);
      } else {
        return this.send("showApplicationSelection");
      }
    };

    Studio.prototype.finish = function() {
      this.is_finished = true;
      if (this.debug) console.log("Finish");
      localStorage.setItem("__appgyver_startpreview_previous_application_json", JSON.stringify(this.application_json));
      return this.send("startApplication", {
        parameters: {
          application: this.application_json,
          server_host: this.host,
          server_port: this.port
        }
      });
    };

    Studio.prototype.get_edge_mode = function(cb) {
      return this.send("getEdgeMode", {
        callbacks: {
          success: cb
        }
      });
    };

    Studio.prototype.set_edge_mode = function(bool, cb) {
      return this.send("setEdgeMode", {
        parameters: {
          edgeMode: (bool ? 1 : 0)
        },
        callbacks: {
          success: cb
        }
      });
    };

    Studio.prototype.spinner = function() {
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

    Studio.prototype.spinner_show = function() {
      return this.spinner_element.style.display = "-webkit-box";
    };

    Studio.prototype.spinner_hide = function() {
      return this.spinner_element.style.display = "none";
    };

    Studio.prototype.alert_about_different_mode = function(json, cb) {
      var _this = this;
      if (json.configuration.client_version != null) {
        return this.get_edge_mode(function(edge_json) {
          if (_this.debug) {
            console.log("EDGE: " + (JSON.stringify(edge_json)) + " JSON.CONFIGURATION.CLIENT_VERSION: " + json.configuration.client_version);
          }
          if (edge_json.edgeMode === "true" && json.configuration.client_version !== "edge") {
            return _this.set_edge_mode(false, function() {
              return _this.send("alert", {
                parameters: {
                  title: "Preview app client mode mismatch",
                  message: "Your project is set to run in normal mode, while your Preview app's client mode is Edge. To let you preview your app, we've changed the Preview app's client mode to normal. Please restart the Preview app for the changes to take effect."
                }
              });
            });
          } else if (edge_json.edgeMode === "false" && json.configuration.client_version !== "normal") {
            return _this.set_edge_mode(true, function() {
              return _this.send("alert", {
                parameters: {
                  title: "Preview app client mode mismatch",
                  message: "Your project is set to run in Edge mode, while your Preview app's client mode is normal. To let you preview your app, we've changed the Preview app's client mode to Edge . Please restart the Preview app for the changes to take effect."
                }
              });
            });
          } else {
            if ((cb != null) && typeof cb === "function") return cb.call();
          }
        });
      } else {
        return this.send("alert", {
          parameters: {
            title: "Studio upgrade required",
            message: "The version of AppGyver Studio you are running is old and does not support this version of the Preview app. Please upgrade your AppGyver Studio to the latest version."
          }
        });
      }
    };

    return Studio;

  })();

  if (this.debug) console.log("Startup!");

  window.studio = new Studio();

  CloudPreview = (function() {

    function CloudPreview() {
      this.reboot = __bind(this.reboot, this);
      this.poll = __bind(this.poll, this);      this.lastTimestamp = Math.round((new Date).getTime() / 1000);
      this.lastCloudBuild = null;
      this.refreshPoller = null;
    }

    CloudPreview.prototype.poll = function(id, hash) {
      var _this = this;
      if (this.refreshPoller) return;
      return this.refreshPoller = setInterval(function() {
        var xhr;
        return xhr = new XHR("https://livepreview.appgyver.com/__appgyver/api/reload/" + id + ".json", {
          success: function(response) {
            if (!response.lastUpdated) return;
            _this.lastCloudBuild = parseInt(response.lastUpdated);
            if (_this.lastCloudBuild > _this.lastTimestamp) {
              _this.lastTimestamp = _this.lastCloudBuild;
              window.studio.already_starting = false;
              return _this.reboot(id, hash);
            }
          }
        });
      }, 1000);
    };

    CloudPreview.prototype.reboot = function(id, hash) {
      clearInterval(this.refreshPoller);
      window.studio.json_url = "https://livepreview.appgyver.com/appgyver/api/applications/" + id + ".json?hash=" + hash;
      return window.studio.start_and_load();
    };

    return CloudPreview;

  })();

  window.cloudPreview = new CloudPreview();

}).call(this);
