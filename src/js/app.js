(function ($) {

    var Utils = {
        hashCode: function (s) {
            return s.split("").reduce(function (a, b) {
                a = ((a < 5) - a) + b.charCodeAt(0);
                return a && a;
            }, 0);
        }
    };

    /**
     *
     * @param options
     * @constructor
     */
    function MSTranslatorApp(options) {

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
            minTextLength: 2
        };

        this.Defaults = $.extend({}, this.Defaults, options);

        this.$element = $(this.Defaults.appElement);
        this.targetLanguageSelect = this.$element.find("#target-language");
        this.sourceLanguageSelect = this.$element.find("#source-language");
        this.textInput = this.$element.find("#text-to-translate");
        this.translateBtn = this.$element.find("#translate-btn");
        this.translatedTextDiv = this.$element.find("#translated-text");
        this.errorPanel = this.$element.find("#error-panel");
        this.loadingCanvas =  $("#loading-canvas");

        this.State = {
            textToTranslate: "",
            targetLanguage: "",
            sourceLanguage: "",
            authToken: "Bearer ",
            canTranslate: function (defaults) {
                return this.textToTranslate !== "" && this.textToTranslate.length >= defaults.minTextLength && this.targetLanguage !== "" && this.sourceLanguage !== "";
            },
            getCacheKey: function () {
                return this.textToTranslate + "-" + this.targetLanguage;
            }
        };

        this.targetLanguageSelect.on("change", $.proxy(this.handleTargetLanguageChange, this));
        this.sourceLanguageSelect.on("change", $.proxy(this.handleSourceLanguageChange, this));
        this.textInput.on("keyup", $.proxy(this.handleTextInputKeyUp, this));
        this.translateBtn.on("click", function (e) {
            e.preventDefault();
            this.translate(this.handleTranslation);
        }.bind(this));
    }

    /**
     * Enables or disables translate button.
     * @param that Reference to the current object.
     */
    MSTranslatorApp.prototype.enableOrDisableTranslateBtn = function (that) {
        that.translateBtn.prop("disabled", !that.State.canTranslate(that.Defaults));
    };

    /**
     * Handles text input change event.
     * @param e Event.
     */
    MSTranslatorApp.prototype.handleTextInputKeyUp = function (e) {
        this.State.textToTranslate = e.target.value;
        this.enableOrDisableTranslateBtn(this);
    };

    /**
     * Handles target language select change event.
     * @param e
     */
    MSTranslatorApp.prototype.handleTargetLanguageChange = function (e) {
        var selectedItem = $(e.target);
        this.State.targetLanguage = selectedItem.val();
        this.enableOrDisableTranslateBtn(this);
    };

    /**
     * Handles source language select change event.
     * @param e
     */
    MSTranslatorApp.prototype.handleSourceLanguageChange = function (e) {
        var selectedItem = $(e.target);
        this.State.sourceLanguage = selectedItem.val();
        this.enableOrDisableTranslateBtn(this);
    };

    /**
     * Stores authentication token in an instance variable.
     * @param token Token.
     */
    MSTranslatorApp.prototype.setAuthToken = function (token) {
        this.State.authToken = "Bearer " + token;
    };

    /**
     * Retrieves authentication token from Azure cloud and executed a callback function.
     * @param callback Callback function.
     */
    MSTranslatorApp.prototype.getToken = function (callback) {
        this.sendRequest(this.Defaults.tokenResource, "POST", this.Defaults.azureTokenHeader, function (data) {
            this.setAuthToken(data);
            callback();
        }.bind(this));
    };

    /**
     * Retrieves available languages codes and executes a callback function to bind the results to the UI.
     * @param callback Callback function to bind the results set to the UI.
     */
    MSTranslatorApp.prototype.getAvailableLanguageCodes = function (callback) {
        var url = this.Defaults.languagesResource.replace("{{token}}", this.State.authToken);
        this.sendJsonpRequest(url, callback);
    };

    /**
     * Retrieves value from local storage.
     * @param key Key.
     */
    MSTranslatorApp.prototype.getFromCache = function (key) {
        console.log("Get from cache: text: " + key + " Hash code: " + Utils.hashCode(key));
        return localStorage.getItem(Utils.hashCode(key));
    };

    /**
     * Stores value in a local storage.
     * @param key Key.
     * @param value Value.
     */
    MSTranslatorApp.prototype.cache = function (key, value) {
        console.log("Cache: Hash code: text: " + key + " Hash code:" + Utils.hashCode(key));
        localStorage.setItem(Utils.hashCode(key), value);
    };

    /**
     * Translates text and executes a callback function if the translate request is successful. The function
     * tries to retrieve content from local storage first and only then issues a call to the
     * MS Translator API.
     * @param callback Callback function.
     */
    MSTranslatorApp.prototype.translate = function (callback) {
        var text = this.getFromCache(this.State.getCacheKey());

        if (text !== null) {
            this.displayTranslatedText(text);
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
    MSTranslatorApp.prototype.displayTranslatedText = function (text) {
        this.translatedTextDiv.text(text);
    };

    /**
     *
     * @param data
     */
    MSTranslatorApp.prototype.handleTranslation = function (data) {
        this.cache(this.State.getCacheKey(), data);
        this.displayTranslatedText(data);
    };


    /**
     * Initializes the application.
     */
    MSTranslatorApp.prototype.init = function () {
        this.getToken(function () {
            this.getAvailableLanguageCodes(function (data) {
                this.bindLanguages(data);
            }.bind(this));
        }.bind(this));
    };

    /**
     * Sends a JSONP request.
     * @param url Request URL.
     * @param callback Callback function.
     */
    MSTranslatorApp.prototype.sendJsonpRequest = function (url, callback) {
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
            that.loadingCanvas.hide();
        });
    };

    MSTranslatorApp.prototype.showError = function (message) {
        this.errorPanel.text(message);
        this.errorPanel.show();
        this.loadingCanvas.hide();
    };

    /**
     * Sends a standard AJAX request.
     * @param url URL.
     * @param type Request method.
     * @param headers Headers.
     * @param callback Callback function.
     */
    MSTranslatorApp.prototype.sendRequest = function (url, type, headers, callback) {
        var that = this;

        this.loadingCanvas.show();

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
            that.loadingCanvas.hide();
        });

        request.fail(function (jqXHR) {
            if (jqXHR.responseText !== "") {
                var responseText = JSON.parse(jqXHR.responseText);
                console.error(responseText.statusCode + ": " + responseText.message);
                that.showError("Could not execute request. " + responseText.statusCode + ": " + responseText.message);
            } else {
                that.showError("Unexpected error occurred. Could not execute request.");
            }
        });
    };

    /**
     * Binds languages retrieved from MS Translator API to the UI.
     * @param languages Languages.
     */
    MSTranslatorApp.prototype.bindLanguages = function (languages) {
        var that = this;

        $.each(languages.sort(), function () {
            var template = that.OPTION_TEMPLATE.replace("{{id}}", this).replace("{{value}}", this);
            that.targetLanguageSelect.append(template);
            that.sourceLanguageSelect.append(template);
        });

    };

    $(document).ready(function () {
        var ts = new MSTranslatorApp().init();
    });

})(jQuery);

