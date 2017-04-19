# Microsoft Translator REST API Test

This is a test to play with the Microsoft Translator REST API. Microsoft
Translator REST API requires Azure account so that you can obtain 
application keys to authenticate against the service.

Microsoft offers a free trial.

This is a minimal implementation that includes the following:

* Text translation from a source to target language
* Translated text is cached in local storage. When translation is 
  triggered, the application tries to retrieve content from the local 
  storage first before sending a request to the translator API. 
  
Currently token is reissued with every translation request. Normally it should be reissued after it expires which is 10 minutes. May by implemented later.

## Building the Application

Prerequisites:

* node.js is installed
* gulp is installed

To build the application execute `npm run build`.

## Configure And Run The Application

You can customize the application by passing an options object to the constructor:

```javascript
    var options {
        
    }

    var app = new MsTranslatorApp(options)
```

The following listing shows the default settings:

```javascript

this.Defaults = {
    azureTokenHeader: {
        "Ocp-Apim-Subscription-Key": "replace-with-your-token"
    },
    tokenResource: "https://api.cognitive.microsoft.com/sts/v1.0/issueToken",
    languagesResource: "https://api.microsofttranslator.com/V2/Ajax.svc/GetLanguagesForTranslate?appId={{token}}&oncomplete=processJsonp",
    translateResource: "https://api.microsofttranslator.com/V2/Ajax.svc/Translate?appId={{token}}&text={{text}}&from={{from}}&to={{to}}&oncomplete=processJsonp",
    defaultLanguage: "en",
    appElement: "#translation-app",
    minTextLength: 2
};

```


