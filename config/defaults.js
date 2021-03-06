/*global define,location */
/*jslint sloppy:true */
/*
| Copyright 2014 Esri
|
| Licensed under the Apache License, Version 2.0 (the "License");
| you may not use this file except in compliance with the License.
| You may obtain a copy of the License at
|
|    http://www.apache.org/licenses/LICENSE-2.0
|
| Unless required by applicable law or agreed to in writing, software
| distributed under the License is distributed on an "AS IS" BASIS,
| WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
| See the License for the specific language governing permissions and
| limitations under the License.
*/
define({
    // Default configuration settings for the application. This is where you'll define things like a bing maps key,
    // default group, default app color theme and more. These values can be overwritten by template configuration settings and url parameters.
    "appid": "",
    "oauthappid": null,
    // Group templates must support a group url parameter. This will contain the id of the group.
    "group": "e8789d121074440d899efc2209075d6d",
    // Enter the url to the proxy if needed by the application. See the 'Using the proxy page' help topic for details
    // http://developers.arcgis.com/en/javascript/jshelp/ags_proxy.html
    //"proxyurl": "http://kart.fredrikstad.kommune.no/proxy/proxy.ashx",
    // Example of a template specific property. If your template had several color schemes
    // you could define the default here and setup configuration settings to allow users to choose a different
    // color theme.
    "theme": "#f26e1f",
    "bingKey": "", //Enter the url to your organizations bing maps key if you want to use bing basemaps
    // Defaults to arcgis.com. Set this value to your portal or organization host name.
    "sharinghost": location.protocol + "//" + "arcgis.com",
    "units": null,
    // If your application needs to edit feature layer fields set this value to true. When false the map will
    // be created with layers that are not set to editable which allows the FeatureLayer to load features optimally.
    "editable": false,
    "markerSymbol": "./images/esri-blue-pin-circle-26.png",
    "markerSymbolWidth": 26,
    "markerSymbolHeight": 26,
    "helperServices": {
        "geometry": {
            "url": "http://kart.fredrikstad.kommune.no/arcgis/rest/services/Utilities/Geometry/GeometryServer"
        },
        "printTask": {
            "url": null
        },
        "elevationSync": {
            "url": null
        },
        "geocode": [{
            "url": null
        }]
    },
    // name of the application
    "applicationName": "Kulturminner i Fredrikstad",
    // application icon
    "applicationIcon": "http://kart.fredrikstad.kommune.no/skjenkebevillinger/images/logo.png",
    // application favicon icon
    "applicationFavicon": "http://kart.fredrikstad.kommune.no/skjenkebevillinger/images/logo.png",
    // to display any null values
    "showNullValueAs": "",
    // to set zoom level of map when single feature is selected
    "zoomLevel": 12,
    // when web-map thumbnail icon is not available it will get replaced by this default icon
    "noThumbnailIcon": "/images/default-webmap-thumbnail.png",
    // when attachment is not available it will get replaced by this default icon
    "noAttachmentIcon": "/images/no-attachment.png",
    // to set description field whether it needs to be displayed or not in web-map description area
    "webMapInfoDescription": true,
    // to set snippet field whether it needs to be displayed or not in web-map description area
    "webMapInfoSnippet": false,
    // to set owner field whether it needs to be displayed or not in web-map description area
    "webMapInfoOwner": true,
    // to set created field whether it needs to be displayed or not in web-map description area
    "webMapInfoCreated": false,
    // to set modified field whether it needs to be displayed or not in web-map description area
    "webMapInfoModified": false,
    // to set license info field whether it needs to be displayed or not in web-map description area
    "webMapInfoLicenseInfo": false,
    // to set access information field whether it needs to be displayed or not in web-map description area
    "webMapInfoAccessInformation": false,
    // to set tags field whether it needs to be displayed or not in web-map description area
    "webMapInfoTags": false,
    // to set views field whether it needs to be displayed or not in web-map description area
    "webMapInfoNumViews": false,
    // to set rating field whether it needs to be displayed or not in web-map description area
    "webMapInfoAvgRating": false,
    // to set field of comment to fetch data from it
    "commentField": "Alder",
    // to set field of inspection to fetch data from it
    "inspectionField": "Alder",
    // to set field of omsetning to fetch data from it
    "omsetningField": "Alder",
    // to display comment table popup info
    "usePopupConfigurationForComment": true,
    // to display inspection table popup info
    "usePopupConfigurationForInspection": true,
    // to set the color of feature that is highlighted by selecting a particular row
    "usePopupConfigurationForOmsetning": true,
    // to set the color of feature that is highlighted by selecting a particular row
    "highlightRow": "#C8C8C8",
    // to show non editable layers on selected web map
    "showNonEditableLayers": true,
    // configurable message to indicate that user needs to select record to view the details panel
    "selectFeatureMessage": "Select a feature to get started.",
    // to enable or disable filters, applied on the selected layer
    "enableFilter": true,
    // to set title for help dialog
    "helpDialogTitle": "Help",
    // to set content for help dialog
    "helpDialogContent": "<p>Welcome to Crowdsource Manager! <\/p> <p>Use this application to review and update reports. To get started, choose a category and then choose a report from the table or map.<\/p> <p>The details of that report will load in the panel in the lower left corner of the screen. From this panel, you can also review images, charts, and other information associated with the selected report. Update the report details by clicking the pencil icon, or hold down the CTRL key while clicking multiple reports to open the batch editor.<\/p> <p>View the location of the report using the map in the lower right corner of the application.<\/p><p>Reports can be filtered by time or field values. If time filtering is enabled for your reports, a time slider will appear below the table. Drag the time slider handle(s) to show only reports from a specific time span in the map and table. If filtering based on field values is enabled for your reports, a filter icon will appear in the table header next to the name of the fields that can be used to filter the reports. Click the icon and specify which reports you'd like to see in the table and map.<\/p>",
    // to set the text of popup tab
    "popupTabText": "Byggningsinformasjon",
    // to set the text of media tab
    "mediaTabText": "Media",
    // to set the text of comment tab
    "commentsTabText": "Historie",
    // to set the text of inspection tab
    "inspectionsTabText": "Teknikk",
    // to set the text of omsetning tab
    "omsetningTabText": "Verneverdi",
    // to show/hide help icon
    "showHelpIcon": false,
    // to show as a label for attachment section in popup form where attachments can be added
    "popupFormAttachmentSectionLabel": "Attachments",
    // to show as a label for attachment section in inspections form where attachments can be added
    "inspectionFormAttachmentSectionLabel": "Attachments",
    // to show as a label for attachment section in omsetning form where attachments can be added
    "omsetningFormAttachmentSectionLabel": "Attachments",
    // to show as a label for attachment section in comments form where attachments can be added
    "commentFormAttachmentSectionLabel": "Attachments",
    // configurable message to indicate that the user has sucessfully submitted a new report
    "submitMessage": "Thank you! Your report has been submitted.",
    //Lower level configuration
    "submitReportButtonColor": "#35ac46", //Color for Submit Report button.If EMPTY default color will be  #35ac46.
    // to apply org theming
    "headerBackgroundColor": "#005ce6",
    "headerTextColor": "#fff",
    "bodyBackgroundColor": "#fff",
    "bodyTextColor": "#515151",
    "buttonBackgroundColor": "#fff",
    "buttonTextColor": "#005ce6",
    // to configure which tab will be opened by default when a report is selected.
    "defaultDetailsTab": "Info" // Info, Media, Comments
});
