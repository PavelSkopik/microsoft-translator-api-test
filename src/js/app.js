(function ($) {

    var Utils = {
        hashCode: function (s) {
            return s.split("").reduce(function (a, b) {
                a = ((a < 5) - a) + b.charCodeAt(0);
                return a && a;
            }, 0);
        }
    };

    function TranslationApp(options) {

        this.OPTION_TEMPLATE = '<option id="{{id}}">{{value}}</option>';

        this.Defaults = {
            azureTokenHeader: {
                "Ocp-Apim-Subscription-Key": ""
            },
            tokenResource: "https://api.cognitive.microsoft.com/sts/v1.0/issueToken",
            languagesResource: "https://api.microsofttranslator.com/V2/Ajax.svc/GetLanguagesForTranslate?appId={{token}}&oncomplete=processJsonp",
            translateResource: "https://api.microsofttranslator.com/V2/Ajax.svc/Translate?appId={{token}}&text={{text}}&from={{from}}&to={{to}}&oncomplete=processJsonp",
            defaultLanguage: "en",
            appElement: "#translation-app",
            languagesElement: "",
            translateBtn: ""
        };

        this.options = $.extend({}, this.Defaults, options);

        this.$element = $(this.Defaults.appElement);
        this.targetLanguageSelect = this.$element.find("#target-language");
        this.sourceLanguageSelect = this.$element.find("#source-language");
        this.textInput = this.$element.find("#text-to-translate");
        this.translateBtn = this.$element.find("#translate-btn");
        this.translatedTextDiv = this.$element.find("#translated-text");

        this.LoadingCanvas = {
            show: function () {
                $("#loading-canvas").show();
            },
            hide: function () {
                $("#loading-canvas").hide();
            }
        };

        this.State = {
            textToTranslate: "",
            targetLanguage: "",
            sourceLanguage: "",
            authToken: "Bearer ",
            canTranslate: function () {
                return this.textToTranslate !== "" && this.textToTranslate.length > 4 && this.targetLanguage !== "" && this.sourceLanguage !== "";
            },
            getCacheKey: function () {
                return this.textToTranslate + "-" + this.targetLanguage;
            }
        };

        this.targetLanguageSelect.on("change", $.proxy(this.handleTargetLanguageChange, this));
        this.sourceLanguageSelect.on("change", $.proxy(this.handleSourceLanguageChange, this));
        this.textInput.on("keyup", $.proxy(this.handleTextChange, this));
        this.translateBtn.on("click", function (e) {
            e.preventDefault();
            this.translate(this.handleTranslation);
        }.bind(this));
    }

    /**
     *
     * @param that
     */
    TranslationApp.prototype.enableOrDisableTranslation = function (that) {
        that.translateBtn.prop("disabled", !that.State.canTranslate());
    };

    /**
     *
     * @param e
     */
    TranslationApp.prototype.handleTextChange = function (e) {
        this.State.textToTranslate = e.target.value;
        this.enableOrDisableTranslation(this);
    };

    /**
     *
     * @param e
     */
    TranslationApp.prototype.handleTargetLanguageChange = function (e) {
        var selectedItem = $(e.target);
        this.State.targetLanguage = selectedItem.val();
        this.enableOrDisableTranslation(this);
    };

    /**
     *
     * @param e
     */
    TranslationApp.prototype.handleSourceLanguageChange = function (e) {
        var selectedItem = $(e.target);
        this.State.sourceLanguage = selectedItem.val();
        this.enableOrDisableTranslation(this);
    };

    /**
     *
     * @param token
     */
    TranslationApp.prototype.setAuthToken = function (token) {
        this.State.authToken = "Bearer " + token;
    };

    /**
     *
     * @param callback
     */
    TranslationApp.prototype.getToken = function (callback) {
        this.sendRequest(this.Defaults.tokenResource, "POST", this.Defaults.azureTokenHeader, function (data) {
            this.setAuthToken(data);
            callback();
        }.bind(this));
    };

    /**
     *
     * @param callback
     */
    TranslationApp.prototype.getLanguages = function (callback) {
        var url = this.Defaults.languagesResource.replace("{{token}}", this.State.authToken);
        this.sendJsonpRequest(url, callback);
    };

    /**
     *
     * @param text
     * @returns {boolean}
     */
    TranslationApp.prototype.isCached = function (text) {
        return localStorage.getItem(text) !== null;
    };

    /**
     *
     * @param key
     */
    TranslationApp.prototype.getFromCache = function (key) {
        console.log("Get from cache: text: " + key + " Hash code: " + Utils.hashCode(key));
        return localStorage.getItem(Utils.hashCode(key));
    };

    /**
     *
     * @param key
     * @param value
     */
    TranslationApp.prototype.cache = function (key, value) {
        console.log("Cache: Hash code: text: " + key + " Hash code:" + Utils.hashCode(key));
        localStorage.setItem(Utils.hashCode(key), value);
    };

    /**
     *
     * @param callback
     */
    TranslationApp.prototype.translate = function (callback) {
        var text = this.getFromCache(this.State.getCacheKey());

        if (text !== null) {
            this.displayTranslation(text);
            return;
        }

        var url = this.Defaults.translateResource
            .replace("{{token}}", this.State.authToken)
            .replace("{{text}}", encodeURIComponent(this.State.textToTranslate))
            .replace("{{from}}", encodeURIComponent(this.State.sourceLanguage))
            .replace("{{to}}", encodeURIComponent(this.State.targetLanguage));

        this.sendJsonpRequest(url, $.proxy(callback, this));
    };

    /**
     *
     * @param text
     */
    TranslationApp.prototype.displayTranslation = function (text) {
        this.translatedTextDiv.text(text);
    };

    /**
     *
     * @param data
     */
    TranslationApp.prototype.handleTranslation = function (data) {
        this.cache(this.State.getCacheKey(), data);
        this.displayTranslation(data);
    };


    /**
     *
     */
    TranslationApp.prototype.init = function () {
        this.getToken(function () {
            this.getLanguages(function (data) {
                this.bindLanguages(data);
            }.bind(this));
        }.bind(this));
    };

    /**
     *
     * @param url
     * @param callback
     */
    TranslationApp.prototype.sendJsonpRequest = function (url, callback) {
        var that = this;

        window.processJsonp = function (data) {
            callback(data);
        };

        var req = $.ajax({
            url: url,
            method: "GET",
            dataType: "jsonp",
            contentType: "application/json",
            jsonp: "processJsonp"
        });

        req.done(function () {
            that.LoadingCanvas.hide();
        });
    };

    /**
     *
     * @param url
     * @param type
     * @param headers
     * @param callback
     */
    TranslationApp.prototype.sendRequest = function (url, type, headers, callback) {
        var that = this;

        this.LoadingCanvas.show();

        var getHeaders = function (headers) {
            return headers === null ? {} : headers;
        };

        var request = $.ajax({
            url: url,
            type: type,
            headers: getHeaders(headers),
            crossDomain: true
        });

        request.done(function (data) {
            callback(data);
            that.LoadingCanvas.hide();
        });

        request.fail(function (jqXHR) {
            var responseText = JSON.parse(jqXHR.responseText);
            console.error(responseText.statusCode + ": " + responseText.message);
            that.LoadingCanvas.hide();
        });
    };

    /**
     *
     * @param data
     */
    TranslationApp.prototype.bindLanguages = function (data) {
        var that = this;

        $.each(data.sort(), function () {
            var template = that.OPTION_TEMPLATE.replace("{{id}}", this).replace("{{value}}", this);
            that.targetLanguageSelect.append(template);
            that.sourceLanguageSelect.append(template);
        });

    };

    $(document).ready(function () {
        var ts = new TranslationApp().init();
    });

})(jQuery);

