/*global define */
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
  "map": {
    "error": "Kan ikke opprette kart"
  },
  "webMapList": {
    "owner": "Eier",
    "created": "Opprettingsdato",
    "modified": "Oppdatert dato",
    "description": "Beskrivelse",
    "snippet": "Sammendrag",
    "licenseInfo": "Begrensning av tilgang og bruk",
    "accessInformation": "Credits",
    "tags": "Merker",
    "numViews": "Antall visninger",
    "avgRating": "Vurdering",
    //"noWebMapInGroup": "Konfigurert gruppe er ugyldig, eller ingen elementer er blitt delt med denne gruppen ennå",
    "noWebMapInGroup": "Logg inn for å komme i gang",
    "infoBtnToolTip": "Kartinformasjon",
    "openWebmapList": "Åpne panel",
    "closeWebmapList": "Lukk panel"
  },
  "geoform": {
    "enterInformation": "Detaljer",
    "selectAttachments": "Vedlegg",
    "selectFileText": "Bla gjennom",
    "enterLocation": "Lokasjon",
    "reportItButton": "Send inn",
    "cancelButton": "Avbryt",
    "requiredField": "(obligatorisk)",
    "selectDefaultText": "Select&hellip;",
    "invalidInputValue": "Du må angi en gyldig verdi.",
    "noFieldsConfiguredMessage": "Lagfelt er ikke konfigurert til å samle inn data",
    "invalidSmallNumber": "Angi et heltall",
    "invalidNumber": "Angi et heltall",
    "invalidFloat": "Angi et tall",
    "invalidDouble": "Angi et tall",
    "requiredFields": "Angi verdier for alle obligatoriske felt",
    "selectLocation": "Velg lokasjonen for rapporten",
    "numericRangeHintMessage": "${openStrong}Hint:${closeStrong} Minimumsverdi  ${minValue} og maksimumsverdi ${maxValue}",
    "dateRangeHintMessage": "${openStrong}Hint:${closeStrong} Laveste dato ${minValue} og høyeste dato ${maxValue}",
    "errorsInApplyEdits": "Kan ikke sende inn rapporten",
    "attachmentSelectedMsg": "vedlegg valgt",
    "attachmentUploadStatus": "kan ikke laste opp ${failed} av ${total} vedlegg",
    "geoLocationError": "Gjeldende plassering er ikke tilgjengelig",
    "geoLocationOutOfExtent": "Gjeldende plassering er utenfor bakgrunnskartets utstrekning",
    "submitButtonTooltip": "Send inn",
    "cancelButtonTooltip": "Avbryt",
    "geoformBackButtonTooltip": "Gå tilbake til listen",
    "updateFeaturesConfirmationMsg": "${count} geoobjekter blir oppdatert",
    "attachmentHeaderText": "Vedlegg",
    "unknownPopupAttachment": "FIL",
    "unableToEditPopupMessage": "Du har ikke tillatelse til å utføre denne handlingen."
  },
  "mapViewer": {
    "zoomInToolTip": "Zoom inn",
    "zoomOutToolTip": "Zoom ut"
  },
  "applicationHeader": {
    "signInOption": "Logg på",
    "signOutOption": "Logg ut",
    "pleaseSignInText": "Du må logge på"
  },
  "dataviewer": {
    "noIssuesReported": "Ingen tilgjengelige rapporter",
    "noFeatureGeometry": "Kan ikke vise geoobjekt",
    "ascendingFlagTitle": "Sorter i stigende rekkefølge",
    "descendingFlagTitle": "Sorter i synkende rekkefølge",
    "filterLabel": "Filter",
    "valueRadioButtonLabel": "Verdi",
    "uniqueRadioButtonLabel": "Unike",
    "selectLayerToBegin": "Velg en kategori for å komme i gang",
    "submitReportButtonText": "Legg til ny",
    "layerFeatureCount": "${featureCount} poster"
  },
  "timeSlider": {
    "timeSliderLabel": "Tidsrom",
    "timeSliderInEditModeAlert": "Glidebryteren for tid er ikke tilgjengelig under redigering"
  },
  "comment": {
    "commentsFormSubmitButton": "Send inn",
    "commentsFormCancelButton": "Avbryt",
    "errorInSubmittingComment": "Kan ikke lagre redigeringer.",
    "emptyCommentMessage": "Verdi er obligatorisk",
    "placeHolderText": "",
    "noCommentsAvailableText": "Ingen tilgjengelige poster",
    "remainingTextCount": "${0} tegn gjenstår",
    "showNoText": "Nei",
    "selectAttachments": "Vedlegg",
    "selectFileText": "Bla gjennom",
    "attachmentSelectedMsg": "Vedlegg valgt",
    "attachmentHeaderText": "Vedlegg",
    "addRecordText": "Legg til post",
    "unknownCommentAttachment": "FIL",
    "unableToAddOrEditCommentMessage": "Du har ikke tillatelse til å utføre denne handlingen."
  },
  "main": {
    "noGroup": "Ingen gruppe er konfigurert"
  },
  "search": {
    "searchIconTooltip": "Søk i dette laget",
    "noResultFoundText": "Fant ingen resultater",
    "searchInEditModeAlert": "Søk er ikke tilgjengelig under redigering"
  },
  "manualRefresh": {
    "manualRefreshIconTooltip": "Oppdater",
    "confirmManualRefreshText": "Alle utvalg og endringer som ikke er lagret, forkastes"
  },
  "help": {
    "helpIconTooltip": "Hjelp"
  },
  "filter": {
    "noFeatureFoundText": "Finner ingen geoobjekter for denne verdien.",
    "distinctQueryFalied": "Finner ingen distinkte verdier for feltet.",
    "andText": "og",
    "filterInEditModeAlert": "Filtre er ikke tilgjengelig under redigering",
    "dropdownSelectOption": "Velg"
  },
  "detailsPanel": {
    "editContentText": "Rediger post", // Displayed on hover of edit toggle button
    "deleteContentText": "Slett post", // Displayed on hover of delete toggle button
    "selectFeatureMessage": "Velg en post for å komme i gang.",
    "delete": "Slett",
    "verifyDelete": "Er du sikker på at du vil slette posten?",
    "deleteAttachmentError": "Vedlegget ble ikke slettet"
  },
  "signOutPage": {
    "signOutMessage": "Du er logget av",
    "reSignInMessage": "Klikk her for å logge på"
  },
  "selectionOptions": {
      "selectionOptionsIconTooltip": "Utvalgsmuligheter", // Displayed on hover of selection options icon
      "showAllOptionText": "Vis Alle", // Displayed as a option in list of selection options
      "showSelectedOptionText": "Vis Valgt" // Displayed as a option in list of selection options
  },
  "locator": {
      "addressText": "Address:", // Shown as a title for a group of addresses returned on performing unified search
      "usngText": "USNG", // Shown as a title for a group of USNG values returned on performing unified search
      "mgrsText": "MGRS", // Shown as a title for a group of MGRS values returned on performing unified search
      "latLongText": "Latitude/Longitude", // Shown as a title for a group of latitude longitude values returned on performing unified search
      "invalidSearch": "No results found", // Shown in the address container when no results are returned on performing unified search
      "locatorPlaceholder": "Enter an address to search", // Shown in the address container textbox as a placeholder
      "locationOutOfExtent": "Located address is out of basemap extent", // Shown as an alert when the selected address in the search result is out of basemap extent
      "searchButtonTooltip": "Search", // Tooltip for search button
      "clearButtonTooltip": "Clear search value" // Tooltip for Geocoder clear button
  },
  "inspection": {
      "inspectionsFormSubmitButton": "Send inn",
      "inspectionsFormCancelButton": "Avbryt",
      "errorInSubmittingInspection": "Kan ikke lagre redigeringer.",
      "emptyInspectionMessage": "Verdi er obligatorisk",
      "placeHolderText": "",
      "noInspectionsAvailableText": "Ingen tilgjengelige poster",
      "remainingTextCount": "${0} tegn gjenstår",
      "showNoText": "Nei",
      "selectAttachments": "Vedlegg",
      "selectFileText": "Bla gjennom",
      "attachmentSelectedMsg": "Vedlegg valgt",
      "attachmentHeaderText": "Vedlegg",
      "addRecordText": "Legg til post",
      "unknownInspectionAttachment": "FIL",
      "unableToAddOrEditInspectionMessage": "Du har ikke tillatelse til å utføre denne handlingen."
  },
});
