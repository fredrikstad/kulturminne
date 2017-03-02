/*global define,$,dojoConfig,window */
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
define([
    "dojo/_base/declare",
    "dojo/text!./templates/omsetning.html",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "dojo/_base/lang",
    "esri/layers/FeatureLayer",
    "dojo/on",
    "dojo/_base/array",
    "esri/tasks/RelationshipQuery",
    "esri/tasks/query",
    "esri/request",
    "dojo/dom-construct",
    "dojo/dom-class",
    "dojo/dom",
    "dojo/dom-attr",
    "dojo/dom-style",
    "esri/dijit/PopupTemplate",
    "dijit/layout/ContentPane",
    "widgets/details-panel/omsetning-form",
    "dojo/_base/array",
    "dojo/DeferredList",
    "dojo/query",
    "dojo/domReady!"
], function (
    declare,
    template,
    _WidgetBase,
    _TemplatedMixin,
    _WidgetsInTemplateMixin,
    lang,
    FeatureLayer,
    on,
    array,
    RelationshipQuery,
    Query,
    esriRequest,
    domConstruct,
    domClass,
    dom,
    domAttr,
    domStyle,
    PopupTemplate,
    ContentPane,
    OmsetningForm,
    arrayUtil,
    DeferredList,
    query
) {
    return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: template,

        _omsetningPopupTable: null, // stores object of omsetning popup table
        _relatedRecords: [], // stores object of related record features
        _omsetningformInstance: null, // to store instance of omsetning form
        _addOmsetningBtnClickHandle: null, // to store click handle of add omsetning button
        _entireOmsetningArr: null, // to store omsetning
        _entireAttachmentsArr: null, // to store attachments

        i18n: {}, // to stores nls strings

        /**
        * This function is called when widget is constructed
        * @param{object} parameters of widget
        * @memberOf widgets/details-panel/omsetning
        */
        constructor: function (options) {
            lang.mixin(this, options);
            this.i18n = this.appConfig.i18n;
        },

        /**
        * This function is designed to handle processing after any DOM fragments
        * have been actually added to the document.
        * @memberOf widgets/details-panel/omsetning
        */
        startup: function () {
            this._showOmsetning(this.multipleFeatures[0], this.omsetningContainer);
        },

        /**
        * Method will get related table info and check if any relationship exist for omsetning.
        * If Omsetning relationship exist as per the configured field then
        * it will get the related table info for further use
        * Considering only the first related table although the layer has many related table
        * @memberOf widgets/details-panel/omsetning
        */
        _showOmsetning: function (graphic, parentDiv) {
            var relatedTableURL;
            this.appUtils.showLoadingIndicator();
            this._entireOmsetningArr = null;
            this._entireAttachmentsArr = null;
            // if omsetning field is present in config file and the layer contains related table, fetch the first related table URL
            if (this.selectedOperationalLayer.relationships.length > 0) {
                // Construct the related table URL form operational layer URL and the related table id
                // We are considering only first related table although the layer has many related table.
                // Hence, we are fetching relatedTableId from relationships[0]
                // ie: "operationalLayer.relationships[0].relatedTableId"
                // Create omsetning table if not exist from the first related table of the layer
                if (!this._omsetningTable) {
                    relatedTableURL = this.selectedOperationalLayer.url.substr(0, this.selectedOperationalLayer.url.lastIndexOf('/') + 1) + this.selectedOperationalLayer.relationships[2].relatedTableId;
                    this._omsetningTable = new FeatureLayer(relatedTableURL);
                    if (this.itemInfo && this.itemInfo.itemData && this.itemInfo.itemData.tables) {
                        array.some(this.itemInfo.itemData.tables, lang.hitch(this, function (currentTable) {
                            if (this._omsetningTable && this._omsetningTable.url) {
                                if (currentTable.url === this._omsetningTable.url && currentTable.popupInfo) {
                                    this._omsetningPopupTable = currentTable;
                                }
                            }
                        }));
                    }
                }
                if (!this._omsetningTable.loaded) {
                    on(this._omsetningTable, "load", lang.hitch(this, function () {
                        this._loadOmsetningIfExist(graphic, parentDiv);
                    }));
                } else {
                    this._loadOmsetningIfExist(graphic, parentDiv);
                }
            } else {
                this.hideOmsetningTab();
                this.appUtils.hideLoadingIndicator();
            }
        },

        /**
        * This function is used to check whether omsetning are available or not to display
        * @memberOf widgets/details-panel/omsetning
        */
        _loadOmsetningIfExist: function (graphic, parentDiv) {
            if ((this.appConfig.usePopupConfigurationForOmsetning) && (this._omsetningPopupTable) && (this._hasEditableField())) {
                this._fetchOmsetning(graphic, parentDiv);
            } else if ((!this.appConfig.usePopupConfigurationForOmsetning) && (this._hasOmsetningField() && (this._hasEditableField()))) {
                this._fetchOmsetning(graphic, parentDiv);
            } else {
                this.hideOmsetningTab();
                this.appUtils.hideLoadingIndicator();
            }
        },

        /**
        * This function is used to fetch omsetning from table
        * @param {object} graphic contains related feature object
        * @memberOf widgets/details-panel/omsetning
        */
        _fetchOmsetning: function (graphic, parentDiv) {
            var relatedQuery, currentID;
            currentID = graphic.attributes[this.selectedOperationalLayer.objectIdField];
            relatedQuery = new RelationshipQuery();
            relatedQuery.outFields = ["*"];
            relatedQuery.relationshipId = this.selectedOperationalLayer.relationships[2].id;
            relatedQuery.objectIds = [currentID];
            // Query for related features and showing omsetning
            this.selectedOperationalLayer.queryRelatedFeatures(relatedQuery, lang.hitch(this, function (relatedFeatures) {
                var omsetningParentDiv, pThis, omsetningContainerDiv, i, deferredListArr;
                deferredListArr = [];
                pThis = this;
                this._relatedRecords = relatedFeatures;
                omsetningContainerDiv = domConstruct.create("div", {}, parentDiv);
                omsetningParentDiv = domConstruct.create("div", { "class": "esriCTomsetningParentDiv" }, omsetningContainerDiv);
                function sortOmsetning(a, b) {
                    if (a.attributes[pThis._omsetningTable.objectIdField] > b.attributes[pThis._omsetningTable.objectIdField]) {
                        return -1; // order a before b
                    }
                    if (a.attributes[pThis._omsetningTable.objectIdField] < b.attributes[pThis._omsetningTable.objectIdField]) {
                        return 1; // order b before a
                    }
                    return 0; // a & b have same date, so relative order doesn't matter
                }
                if (this._relatedRecords[currentID] && this._relatedRecords[currentID].features && this._relatedRecords[currentID].features.length > 0) {
                    this._attachEventToAddOmsetningButton();
                    this._relatedRecords[currentID].features.sort(sortOmsetning);
                    for (i = 0; i < this._relatedRecords[currentID].features.length; i++) {
                        if (!this.appConfig.usePopupConfigurationForOmsetning) {
                            this._createPopUpForSingleField(this._relatedRecords[currentID].features[i]);
                        }
                        deferredListArr.push(this._createPopUpContent(this._relatedRecords[currentID].features[i], omsetningParentDiv));
                    }
                    this._getAllOmsetning(deferredListArr);
                } else {
                    if (!this.appConfig.usePopupConfigurationForOmsetning) {
                        this._createPopUpForSingleField();
                    }
                    this._attachEventToAddOmsetningButton();
                    this.showOmsetningTab();
                    domAttr.set(dom.byId("omsetningTotalCount"), "innerHTML", "(" + 0 + ")"); //ignore jslint
                    this.appUtils.hideLoadingIndicator();
                }
            }), lang.hitch(this, function () {
                this.hideOmsetningTab();
                this.appUtils.hideLoadingIndicator();
            }));
        },

        /**
        * This function is used to get all the omsetning
        * @memberOf widgets/details-panel/omsetning
        */
        _getAllOmsetning: function (deferredListArr) {
            var deferredList;
            deferredList = new DeferredList(deferredListArr);
            deferredList.then(lang.hitch(this, function (response) {
                this._entireOmsetningArr = response;
                if (this._entireOmsetningArr.length > 0) {
                    if (this._omsetningTable.hasAttachments) {
                        this._getAllAttachments();
                    } else {
                        this._displayOmsetningAndAttachments();
                    }
                } else {
                    this.hideOmsetningTab();
                    this.appUtils.hideLoadingIndicator();
                }
            }), lang.hitch(this, function () {
                this.hideOmsetningTab();
                this.appUtils.hideLoadingIndicator();
            }));
        },

        /**
        * This function is used to get all the attachments
        * @memberOf widgets/details-panel/omsetning
        */
        _getAllAttachments: function () {
            var deferredList, deferredListArr, i;
            deferredListArr = [];
            for (i = 0; i < this._entireOmsetningArr.length; i++) {
                deferredListArr.push(this._omsetningTable.queryAttachmentInfos(this._entireOmsetningArr[i][1].features[0].attributes[this.selectedOperationalLayer.objectIdField]));
            }
            deferredList = new DeferredList(deferredListArr);
            deferredList.then(lang.hitch(this, function (response) {
                this._entireAttachmentsArr = response;
                this._displayOmsetningAndAttachments();
            }), lang.hitch(this, function () {
                this.hideOmsetningTab();
                this.appUtils.hideLoadingIndicator();
            }));
        },

        /**
        * This function is used display omsetning and attachments
        * @memberOf widgets/details-panel/omsetning
        */
        _displayOmsetningAndAttachments: function () {
            var i, omsetningContentPaneContainer, omsetningContentPane, omsetningParentDiv;
            for (i = 0; i < this._entireOmsetningArr.length; i++) {
                omsetningParentDiv = query(".esriCTomsetningParentDiv")[0];
                omsetningContentPaneContainer = domConstruct.create("div", { "class": "esriCTOmsetningPopup" }, omsetningParentDiv);
                omsetningContentPane = new ContentPane({}, omsetningContentPaneContainer);
                if (!this._entireOmsetningArr[i][1].features[0].infoTemplate) {
                    this._entireOmsetningArr[i][1].features[0].setInfoTemplate(new PopupTemplate(this._omsetningPopupTable.popupInfo));
                }
                omsetningContentPane.startup();
                omsetningContentPane.set('content', this._entireOmsetningArr[i][1].features[0].getContent());
                this._checkAttachments(omsetningContentPaneContainer, i);
                this._createOmsetningButton(omsetningContentPaneContainer, this._entireOmsetningArr[i][1].features[0]);
                this._deleteOmsetningButton(omsetningContentPaneContainer, this._entireOmsetningArr[i][1].features[0]);
            }
            this.showOmsetningTab();
            domAttr.set(dom.byId("omsetningTotalCount"), "innerHTML", "(" + this._entireOmsetningArr.length + ")");
            this.appUtils.hideLoadingIndicator();
        },

        /**
        * This function is used to check whether one of the field is editable or not
        * @memberOf widgets/details-panel/omsetning
        */
        _hasEditableField: function () {
            var hasEditableField = false, k;
            if (this._omsetningPopupTable && this._omsetningPopupTable.popupInfo) {
                for (k = 0; k < this._omsetningPopupTable.popupInfo.fieldInfos.length; k++) {
                    if (this._omsetningPopupTable.popupInfo.fieldInfos[k].isEditable) {
                        hasEditableField = true;
                        break;
                    }
                }
            }
            return hasEditableField;
        },

        /**
        * This function is used to check whether omsetning's field that is configured is available in omsetning table or not.
        * @memberOf widgets/details-panel/omsetning
        */
        _hasOmsetningField: function () {
            var k, hasOmsetningField = false;
            if (this.appConfig.omsetningField) {
                // if the related table contains omsetning field set omsetningIconFlag to true
                for (k = 0; k < this._omsetningTable.fields.length; k++) {
                    if (this._omsetningTable.fields[k].name === this.appConfig.omsetningField) {
                        hasOmsetningField = true;
                        break;
                    }
                }
            }
            return hasOmsetningField;
        },

        /**
        * This function is used to create common popup omsetning contents
        * @memberOf widgets/details-panel/omsetning
        */
        _createPopUpContent: function (currentFeature) {
            var queryFeature, currentDateTime = new Date().getTime();
            queryFeature = new Query();
            queryFeature.objectIds = [parseInt(currentFeature.attributes[this.selectedOperationalLayer.objectIdField], 10)];
            queryFeature.outFields = ["*"];
            queryFeature.where = currentDateTime + "=" + currentDateTime;
            this._omsetningTable.setInfoTemplate(new PopupTemplate(this._omsetningPopupTable.popupInfo));
            return this._omsetningTable.queryFeatures(queryFeature);
        },

        /**
        * Check whether attachments are available in layer and enabled in webmap
        * @memberOf widgets/details-panel/omsetning
        **/
        _checkAttachments: function (omsetningContentPaneContainer, index) {
            if (this._omsetningTable.hasAttachments) {
                var attachmentsDiv = $(".attachmentsSection", omsetningContentPaneContainer)[0];
                if (attachmentsDiv) {
                    domConstruct.empty(attachmentsDiv);
                    domStyle.set(attachmentsDiv, "display", "block");
                    domClass.remove(attachmentsDiv, "hidden");
                    this._showAttachments(attachmentsDiv, index);
                }
            }
        },

        /**
        * Query layer to get attachments
        * @param{object} graphic
        * @param{object} attachmentContainer
        * @memberOf widgets/details-panel/omsetning
        **/
        _showAttachments: function (attachmentContainer, index) {
            var fieldContent, i, attachment, deleteAttachmentContainer, attachmentWrapper, imageThumbnailContainer, imageThumbnailContent, imageContainer, fileTypeContainer, isAttachmentAvailable, imagePath, imageDiv;
            //check if attachments found
            if (this._entireAttachmentsArr[index][1] && this._entireAttachmentsArr[index][1].length > 0) {
                //Create attachment header text
                domConstruct.create("div", { "innerHTML": this.appConfig.i18n.comment.attachmentHeaderText, "class": "esriCTAttachmentHeader" }, attachmentContainer);
                fieldContent = domConstruct.create("div", { "class": "esriCTThumbnailContainer" }, attachmentContainer);
                // display all attached images in thumbnails
                for (i = 0; i < this._entireAttachmentsArr[index][1].length; i++) {
                    attachment = this._entireAttachmentsArr[index][1][i];
                    attachmentWrapper = domConstruct.create("div", {"class": "esriCTThumbnailWrapper"}, fieldContent);
                    imageThumbnailContainer = domConstruct.create("div", { "class": "esriCTNonImageContainer", "alt": attachment.url }, attachmentWrapper);
                    imageThumbnailContent = domConstruct.create("div", { "class": "esriCTNonImageContent" }, imageThumbnailContainer);
                    imageContainer = domConstruct.create("div", {}, imageThumbnailContent);
                    fileTypeContainer = domConstruct.create("div", { "class": "esriCTNonFileTypeContent" }, imageThumbnailContent);
                    isAttachmentAvailable = true;
                    // set default image path if attachment has no image URL
                    imagePath = dojoConfig.baseURL + this.appConfig.noAttachmentIcon;
                    imageDiv = domConstruct.create("img", { "alt": this._entireAttachmentsArr[index][1][i].url, "class": "esriCTAttachmentImg", "src": imagePath }, imageContainer);
                    this._fetchDocumentContentType(this._entireAttachmentsArr[index][1][i], fileTypeContainer);
                    this._fetchDocumentName(this._entireAttachmentsArr[index][1][i], imageThumbnailContainer);
                    on(imageThumbnailContainer, "click", lang.hitch(this, this._displayImageAttachments));
                    //Create delete attachment button
                    deleteAttachmentContainer = domConstruct.create("div", {
                      "class": "esriCTDeleteAttachmentButton btn-danger",
                      "id": attachment.id,
                      "innerHTML": this.appConfig.i18n.detailsPanel.delete
                    }, attachmentWrapper);
                    domConstruct.create("span", {"class": "glyphicon glyphicon-trash"}, deleteAttachmentContainer, "first");
                    on(deleteAttachmentContainer, "click", lang.hitch(this, function () {
                      this._deleteAttachment(attachment);
                    }));
                }
                if (!isAttachmentAvailable) {
                    domClass.add(attachmentContainer, "hidden");
                }
            }
        },

        /**
        * Function to delete attachments
        @param{object} attachment object
        * @memberOf widgets/details-panel/omsetning
        **/
        _deleteAttachment: function(attachment) {
          var requestUrl = attachment.url.split('/attachments/')[0] + '/deleteAttachments';
          var deleteRequest = esriRequest({
            url: requestUrl,
            content: {
              attachmentIds: attachment.id,
              rollbackOnFailure:true,
              f: "json"},
            callbackParamName: "callback"
          });
          this.appUtils.showLoadingIndicator();
          deleteRequest.then(lang.hitch(this, function (response) {
            //console.log("Success: ", response);
            omsetningParentDiv = query(".esriCTomsetningParentDiv")[0];
            domConstruct.empty(omsetningParentDiv);
            this._getAllAttachments();
            this.appUtils.hideLoadingIndicator();
          }), lang.hitch(this, function (error) {
            //console.log("Error: ", error);
            alert("Error: " + error);
            this.appUtils.hideLoadingIndicator();
          }));
        },

        /**
        * Function to fetch document content type
        * @param{object} attachment object
        * @memberOf widgets/details-panel/omsetning
        **/
        _fetchDocumentContentType: function (attachmentData, fileTypeContainer) {
            var typeText, fileExtensionRegEx, fileExtension;
            fileExtensionRegEx = /(?:\.([^.]+))?$/; //ignore jslint
            fileExtension = fileExtensionRegEx.exec(attachmentData.name);
            if (fileExtension && fileExtension[1]) {
                typeText = "." + fileExtension[1].toUpperCase();
            } else {
                typeText = this.appConfig.i18n.comment.unknownOmsetningAttachment;
            }
            domAttr.set(fileTypeContainer, "innerHTML", typeText);
        },

        /**
        * Function to fetch document name
        * @param{object} attachment object
        * @param{object} dom node
        * @memberOf widgets/details-panel/omsetning
        **/
        _fetchDocumentName: function (attachmentData, container) {
            var attachmentNameWrapper, attachmentName;
            attachmentNameWrapper = domConstruct.create("div", { "class": "esriCTNonImageName" }, container);
            attachmentName = domConstruct.create("div", {
                "class": "esriCTNonImageNameMiddle",
                "innerHTML": attachmentData.name
            }, attachmentNameWrapper);
        },

        /**
        * This function is used to show attachments in new window when user clicks on the attachment thumbnail
        * @param{object} evt
        * @memberOf widgets/details-panel/omsetning
        **/
        _displayImageAttachments: function (evt) {
            window.open(domAttr.get(evt.currentTarget, "alt"));
        },

        /**
        * This function is used to create edit omsetning button
        * @memberOf widgets/details-panel/omsetning
        */
        _createOmsetningButton: function (parentDiv, graphic) {
            var omsetningBtnDiv;
            omsetningBtnDiv = domConstruct.create("div", {
              "class": "esriCTOmsetningButton esrictfonticons esrictfonticons-pencil esriCTBodyTextColor",
              "title": this.appConfig.i18n.detailsPanel.editContentText
            }, parentDiv);
            on(omsetningBtnDiv, "click", lang.hitch(this, function () {
                if (this.appConfig.logInDetails.canEditFeatures) {
                    this.appUtils.showLoadingIndicator();
                    domClass.add(this.addOmsetningBtnWrapperContainer, "esriCTHidden");
                    this._createOmsetningForm(graphic, false);
                    domStyle.set(this.omsetningContainer, "display", "none");
                    $('#tabContent').animate({
                        scrollTop: 0
                    });
                } else {
                    this.appUtils.showMessage(this.appConfig.i18n.comment.unableToAddOrEditOmsetningMessage);
                }
            }));
        },

        /**
        * This function is used to create delete omsetning button
        * @memberOf widgets/details-panel/omsetning
        */
        _deleteOmsetningButton: function (parentDiv, graphic) {
            var deleteOmsetningBtnDiv;
            deleteOmsetningBtnDiv = domConstruct.create("div", {
              "class": "btn btn-sm btn-danger esriCTDeleteOmsetningButton",
              "innerHTML": this.appConfig.i18n.detailsPanel.delete,
              "title": this.appConfig.i18n.detailsPanel.deleteContentText
            }, parentDiv);
            domConstruct.create("span", {"class": "glyphicon glyphicon-trash"}, deleteOmsetningBtnDiv, "first");
            on(deleteOmsetningBtnDiv, "click", lang.hitch(this, function () {

              console.log(graphic.attributes.OBJECTID);
              if (confirm(this.appConfig.i18n.detailsPanel.verifyDelete)) {

                this.appUtils.showLoadingIndicator();
                this._omsetningTable.applyEdits(null, null, [graphic], lang.hitch(this, function () { //ignore jslint
                  domConstruct.empty(this.omsetningContainer);
                  domStyle.set(this.omsetningContainer, "display", "block");
                  this._showOmsetning(this.multipleFeatures[0], this.omsetningContainer);
                  //Hide loading indicator
                  this.appUtils.hideLoadingIndicator();
                }), lang.hitch(this, function (err) {
                    //Hide loading indicator
                    this.appUtils.hideLoadingIndicator();
                    // Show error message
                    this.appUtils.showError(err);
                }));
              } else {
                console.log('Do nothing');
              }
            }));
        },

        /**
        * This function is used hide omsetning Tab
        * @memberOf widgets/details-panel/omsetning
        */
        hideOmsetningTab: function () {
            return;
        },

        /**
        * This function is used show omsetning Tab
        * @memberOf widgets/details-panel/omsetning
        */
        showOmsetningTab: function () {
            return;
        },

        /**
        * Instantiate omsetning-form widget
        * @param {object} item contains selected feature object
        * @memberOf widgets/details-panel/omsetning
        */
        _createOmsetningForm: function (item, addOmsetning) {
            if (this._omsetningformInstance) {
                this._omsetningformInstance.destroy();
            }
            domConstruct.empty(dom.byId("omsetningformContainer"));
            //Create new instance of OmsetningForm
            this._omsetningformInstance = new OmsetningForm({
                config: this.appConfig,
                omsetningTable: this._omsetningTable,
                omsetningPopupTable: this._omsetningPopupTable,
                itemInfos: this.itemInfo,
                appUtils: this.appUtils,
                nls: this.appConfig.i18n,
                item: item,
                selectedLayer: this.selectedOperationalLayer,
                addOmsetning: addOmsetning
            }, domConstruct.create("div", {}, dom.byId("omsetningformContainer")));

            // attach cancel button click event
            this._omsetningformInstance.onCancelButtonClick = lang.hitch(this, function () {
                this._showPanel(dom.byId("omsetningformContainer"));
                // display add omsetning button
                domClass.remove(this.addOmsetningBtnWrapperContainer, "esriCTHidden");
                this.isOmsetningFormOpen = false;
                //Check if application is running on android devices, and show/hide the details panel
                //This resolves the jumbling of content in details panel on android devices
                if (this.appUtils.isAndroid()) {
                    this.toggleDetailsPanel();
                }
                domStyle.set(this.omsetningContainer, "display", "block");
                //Scroll to top position when clicked cancel need ID to use scrollTop
                dom.byId("tabContent").scrollTop = 0;
                this.appUtils.hideLoadingIndicator();
            });
            this._omsetningformInstance.onOmsetningFormSubmitted = lang.hitch(this, function () {
                //close the omsetning form after submitting new omsetning
                this._showPanel(dom.byId("omsetningformContainer"));
                // display add omsetning button
                domClass.remove(this.addOmsetningBtnWrapperContainer, "esriCTHidden");
                this.isOmsetningFormOpen = false;
                //update omsetning list
                domConstruct.empty(this.omsetningContainer);
                domStyle.set(this.omsetningContainer, "display", "block");
                this._showOmsetning(this.multipleFeatures[0], this.omsetningContainer);
                // this.appUtils.hideLoadingIndicator();
            });
            this._showPanel(dom.byId("omsetningformContainer"));
            //If Omsetning form is close, update the omsetning form open flag
            if (domClass.contains(dom.byId("omsetningformContainer"), "esriCTHidden")) {
                if (this.appUtils.isAndroid()) {
                    this.toggleDetailsPanel();
                }
                this.isOmsetningFormOpen = false;
            } else {
                this.isOmsetningFormOpen = true;
            }
        },

        /**
        * shows and hides the div content
        * @memberOf widgets/details-panel/omsetning
        */
        _showPanel: function (domNode) {
            if (domClass.contains(domNode, "esriCTHidden")) {
                domClass.remove(domNode, "esriCTHidden");
            } else {
                domClass.add(domNode, "esriCTHidden");
            }
        },

        /**
        * Empties the list of omsetning.
        * @memberOf widgets/details-panel/omsetning
        */
        _clearOmsetning: function () {
            domConstruct.empty(this.omsetningList);
            domConstruct.empty(this.noOmsetningDiv);
        },

        /**
        * This function is used to attach click event to add omsetning button
        * @memberOf widgets/details-panel/omsetning
        */
        _attachEventToAddOmsetningButton: function () {
            if (this._addOmsetningBtnClickHandle) {
                this._addOmsetningBtnClickHandle.remove();
            }
            if (this.addOmsetningBtnWrapperContainer) {
                this._addOmsetningBtnClickHandle = on(this.addOmsetningBtnWrapperContainer, "click",
                lang.hitch(this, function () {
                  if (this.appConfig.logInDetails.canEditFeatures) {
                    this.appUtils.showLoadingIndicator();
                    this._openAddOmsetningForm();
                  } else {
                    this.appUtils.showMessage(this.appConfig.i18n.comment.unableToAddOrEditOmsetningMessage);
                  }
                }));
            }
        },

        /**
        * This function is used to open add omsetning form
        * @memberOf widgets/details-panel/omsetning
        */
        _openAddOmsetningForm: function () {
            var item = {};
            domStyle.set(this.omsetningContainer, "display", "none");
            domClass.add(this.addOmsetningBtnWrapperContainer, "esriCTHidden");
            item.attributes = {};
            // Initialize the related keyfield value as default
            item.attributes[this.selectedOperationalLayer.relationships[2].keyField] = this.multipleFeatures[0].attributes[this.selectedOperationalLayer.relationships[2].keyField];
            this._createOmsetningForm(item, true);
        },

        /**
        * This function is used to create popup template for single field
        * @param {object} currentFeature contains selected feature object
        * @memberOf widgets/details-panel/omsetning
        */
        _createPopUpForSingleField: function (currentFeature) {
            var popupInfo = {}, k, singlefieldOmsetning;
            popupInfo.fieldInfos = [];
            popupInfo.mediaInfos = [];
            popupInfo.showAttachments = false;
            popupInfo.title = "";
            for (k = 0; k < this._omsetningTable.fields.length; k++) {
                if (this._omsetningTable.fields[k].name === this.appConfig.omsetningField && this._omsetningTable.fields[k].editable && this._omsetningTable.fields[k].type === "esriFieldTypeString") {
                    popupInfo.fieldInfos.push({
                        fieldName: this._omsetningTable.fields[k].name,
                        format: null,
                        isEditable: this._omsetningTable.fields[k].editable,
                        label: this._omsetningTable.fields[k].alias,
                        stringFieldOption: "textarea",
                        tooltip: "",
                        visible: true
                    });
                    if (currentFeature) {
                        //check for blank single field omsetning and handle space for pencil icon
                        singlefieldOmsetning = currentFeature.attributes[this.appConfig.omsetningField];
                        if (singlefieldOmsetning && singlefieldOmsetning !== "") {
                            popupInfo.description = "{" + this.appConfig.omsetningField + "}" + "\n <div class='omsetningRow'></div>";
                        } else {
                            popupInfo.description = "{" + this.appConfig.omsetningField + "}" + "\n <div class='omsetningRow'>&nbsp</div>";
                        }
                    }
                    break;
                }
            }
            this._omsetningPopupTable.popupInfo = popupInfo;
        },

        /**
        * sets the omsetning associated with an item.
        * @param {array} omsetningArr contains related features array
        * @memberOf widgets/details-panel/omsetning
        */
        _setOmsetning: function (omsetningArr) {
            domConstruct.empty(this.omsetningContainer);
            arrayUtil.forEach(omsetningArr, lang.hitch(this, this._buildOmsetningDiv));
        },

        /**
        * display popup info for related features
        * @param {object} item is selected related feature
        * @memberOf widgets/details-panel/omsetning
        */
        _buildOmsetningDiv: function (item) {
            var omsetningDiv;
            omsetningDiv = domConstruct.create('div', { 'class': 'omsetning' }, this.omsetningContainer);
            new ContentPane({ 'class': 'content small-text', 'content': item.getContent() }, omsetningDiv).startup();
        }
    });
});
