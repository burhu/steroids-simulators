(function() {
  var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  window.XHR = (function() {

    function XHR(url, opts) {
      this.url = url;
      this.opts = opts;
      this.setup_header = __bind(this.setup_header, this);
      this.merge_headers = __bind(this.merge_headers, this);
      this.merge_options = __bind(this.merge_options, this);
      this.default_headers = __bind(this.default_headers, this);
      this.default_opts = __bind(this.default_opts, this);
      this.setup_params = __bind(this.setup_params, this);
      this.done_handler = __bind(this.done_handler, this);
      this.merge_options();
      this.request = new XMLHttpRequest;
      this.request.onreadystatechange = this.done_handler;
      this.request.open(this.opts.type, this.url);
      this.setup_header();
      if (this.opts.data != null) {
        this.request.send(JSON.stringify(this.opts.data));
      } else {
        this.request.send();
      }
      return this.request;
    }

    /*
        When request is done, done handler is called
    */

    XHR.prototype.done_handler = function() {
      var response, _ref, _ref2;
      if (this.request.readyState === 4) {
        if (this.request.status === 200 || this.request.status === 201 || this.request.status === 202) {
          if (this.request.response) {
            response = JSON.parse(this.request.response);
          } else if (this.request.responseText) {
            response = JSON.parse(this.request.responseText);
          } else {
            response = null;
          }
          return (_ref = this.opts.success) != null ? _ref.call(this.request, response, this.request.status, this.request) : void 0;
        } else {
          return (_ref2 = this.opts.failure) != null ? _ref2.call(this.request, this.request.status, this.request) : void 0;
        }
      }
    };

    /*
        Sets up URL parameters
    */

    XHR.prototype.setup_params = function() {};

    /*
        Default settings:
    */

    XHR.prototype.default_opts = function() {
      var defaults;
      defaults = {
        type: "GET",
        headers: this.default_headers()
      };
      return defaults;
    };

    XHR.prototype.default_headers = function() {
      var defaults;
      defaults = {
        "Content-Type": "application/json",
        "Accepts": "application/json, text/javascript, text/plain, text/html, */*"
      };
      return defaults;
    };

    /*
        Merge options
    */

    XHR.prototype.merge_options = function() {
      var key, value, _ref;
      _ref = this.default_opts();
      for (key in _ref) {
        value = _ref[key];
        if (this.opts[key] == null) this.opts[key] = value;
      }
      return this.merge_headers();
    };

    XHR.prototype.merge_headers = function() {
      var key, value, _ref, _results;
      if (this.opts["headers"] == null) {
        return this.opts["headers"] = this.default_headers();
      } else {
        _ref = this.default_headers();
        _results = [];
        for (key in _ref) {
          value = _ref[key];
          if (this.opts["headers"][key] == null) {
            _results.push(this.opts["headers"][key] = value);
          } else {
            _results.push(void 0);
          }
        }
        return _results;
      }
    };

    /*
        Sets up header from options
    */

    XHR.prototype.setup_header = function() {
      var key, value, _ref, _results;
      if (this.opts.headers != null) {
        _ref = this.opts.headers;
        _results = [];
        for (key in _ref) {
          value = _ref[key];
          _results.push(this.request.setRequestHeader(key, value));
        }
        return _results;
      }
    };

    return XHR;

  })();

}).call(this);
