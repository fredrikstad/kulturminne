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
    "dojo/text!./templates/inspections.html",
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
    "widgets/details-panel/inspection-form",
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
    InspectionForm,
    arrayUtil,
    DeferredList,
    query
) {
    return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: template,

        _inspectionPopupTable: null, // stores object of inspections popup table
        _relatedRecords: [], // stores object of related record features
        _inspectionformInstance: null, // to store instance of inspections form
        _addInspectionBtnClickHandle: null, // to store click handle of add inspections button
        _entireInspectionsArr: null, // to store inspections
        _entireAttachmentsArr: null, // to store attachments

        i18n: {}, // to stores nls strings

        /**
        * This function is called when widget is constructed
        * @param{object} parameters of widget
        * @memberOf widgets/details-panel/inspections
        */
        constructor: function (options) {
            lang.mixin(this, options);
            this.i18n = this.appConfig.i18n;
        },

        /**
        * This function is designed to handle processing after any DOM fragments
        * have been actually added to the document.
        * @memberOf widgets/details-panel/inspections
        */
        startup: function () {
            this._showInspections(this.multipleFeatures[0], this.inspectionsContainer);
        },

        /**
        * Method will get related table info and check if any relationship exist for inspections.
        * If Inspections relationship exist as per the configured field then
        * it will get the related table info for further use
        * Considering only the first related table although the layer has many related table
        * @memberOf widgets/details-panel/inspections
        */
        _showInspections: function (graphic, parentDiv) {
            var relatedTableURL;
            this.appUtils.showLoadingIndicator();
            this._entireInspectionsArr = null;
            this._entireAttachmentsArr = null;
            // if inspection field is present in config file and the layer contains related table, fetch the first related table URL
            if (this.selectedOperationalLayer.relationships.length > 0) {
                // Construct the related table URL form operational layer URL and the related table id
                // We are considering only first related table although the layer has many related table.
                // Hence, we are fetching relatedTableId from relationships[0]
                // ie: "operationalLayer.relationships[0].relatedTableId"
                // Create inspections table if not exist from the first related table of the layer
                if (!this._inspectionsTable) {
                    relatedTableURL = this.selectedOperationalLayer.url.substr(0, this.selectedOperationalLayer.url.lastIndexOf('/') + 1) + this.selectedOperationalLayer.relationships[1].relatedTableId;
                    this._inspectionsTable = new FeatureLayer(relatedTableURL);
                    if (this.itemInfo && this.itemInfo.itemData && this.itemInfo.itemData.tables) {
                        array.some(this.itemInfo.itemData.tables, lang.hitch(this, function (currentTable) {
                            if (this._inspectionsTable && this._inspectionsTable.url) {
                                if (currentTable.url === this._inspectionsTable.url && currentTable.popupInfo) {
                                    this._inspectionPopupTable = currentTable;
                                }
                            }
                        }));
                    }
                }
                if (!this._inspectionsTable.loaded) {
                    on(this._inspectionsTable, "load", lang.hitch(this, function () {
                        this._loadInspectionsIfExist(graphic, parentDiv);
                    }));
                } else {
                    this._loadInspectionsIfExist(graphic, parentDiv);
                }
            } else {
                this.hideInspectionsTab();
                this.appUtils.hideLoadingIndicator();
            }
        },

        /**
        * This function is used to check whether inspections are available or not to display
        * @memberOf widgets/details-panel/inspections
        */
        _loadInspectionsIfExist: function (graphic, parentDiv) {
            if ((this.appConfig.usePopupConfigurationForInspection) && (this._inspectionPopupTable) && (this._hasEditableField())) {
                this._fetchInspections(graphic, parentDiv);
            } else if ((!this.appConfig.usePopupConfigurationForInspection) && (this._hasInspectionsField() && (this._hasEditableField()))) {
                this._fetchInspections(graphic, parentDiv);
            } else {
                this.hideInspectionsTab();
                this.appUtils.hideLoadingIndicator();
            }
        },

        /**
        * This function is used to fetch inspections from table
        * @param {object} graphic contains related feature object
        * @memberOf widgets/details-panel/inspections
        */
        _fetchInspections: function (graphic, parentDiv) {
            var relatedQuery, currentID;
            currentID = graphic.attributes[this.selectedOperationalLayer.objectIdField];
            relatedQuery = new RelationshipQuery();
            relatedQuery.outFields = ["*"];
            relatedQuery.relationshipId = this.selectedOperationalLayer.relationships[1].id;
            relatedQuery.objectIds = [currentID];
            // Query for related features and showing inspections
            this.selectedOperationalLayer.queryRelatedFeatures(relatedQuery, lang.hitch(this, function (relatedFeatures) {
                var inspectionsParentDiv, pThis, inspectionsContainerDiv, i, deferredListArr;
                deferredListArr = [];
                pThis = this;
                this._relatedRecords = relatedFeatures;
                inspectionsContainerDiv = domConstruct.create("div", {}, parentDiv);
                inspectionsParentDiv = domConstruct.create("div", { "class": "esriCTinspectionsParentDiv" }, inspectionsContainerDiv);
                function sortInspections(a, b) {
                    if (a.attributes[pThis._inspectionsTable.objectIdField] > b.attributes[pThis._inspectionsTable.objectIdField]) {
                        return -1; // order a before b
                    }
                    if (a.attributes[pThis._inspectionsTable.objectIdField] < b.attributes[pThis._inspectionsTable.objectIdField]) {
                        return 1; // order b before a
                    }
                    return 0; // a & b have same date, so relative order doesn't matter
                }
                if (this._relatedRecords[currentID] && this._relatedRecords[currentID].features && this._relatedRecords[currentID].features.length > 0) {
                    this._attachEventToAddInspectionButton();
                    this._relatedRecords[currentID].features.sort(sortInspections);
                    for (i = 0; i < this._relatedRecords[currentID].features.length; i++) {
                        if (!this.appConfig.usePopupConfigurationForInspection) {
                            this._createPopUpForSingleField(this._relatedRecords[currentID].features[i]);
                        }
                        deferredListArr.push(this._createPopUpContent(this._relatedRecords[currentID].features[i], inspectionsParentDiv));
                    }
                    this._getAllInspections(deferredListArr);
                } else {
                    if (!this.appConfig.usePopupConfigurationForInspection) {
                        this._createPopUpForSingleField();
                    }
                    this._attachEventToAddInspectionButton();
                    this.showInspectionsTab();
                    domAttr.set(dom.byId("inspectionsTotalCount"), "innerHTML", "(" + 0 + ")"); //ignore jslint
                    this.appUtils.hideLoadingIndicator();
                }
            }), lang.hitch(this, function () {
                this.hideInspectionsTab();
                this.appUtils.hideLoadingIndicator();
            }));
        },

        /**
        * This function is used to get all the inspections
        * @memberOf widgets/details-panel/inspections
        */
        _getAllInspections: function (deferredListArr) {
            var deferredList;
            deferredList = new DeferredList(deferredListArr);
            deferredList.then(lang.hitch(this, function (response) {
                this._entireInspectionsArr = response;
                if (this._entireInspectionsArr.length > 0) {
                    if (this._inspectionsTable.hasAttachments) {
                        this._getAllAttachments();
                    } else {
                        this._displayInspectionsAndAttachments();
                    }
                } else {
                    this.hideInspectionsTab();
                    this.appUtils.hideLoadingIndicator();
                }
            }), lang.hitch(this, function () {
                this.hideInspectionsTab();
                this.appUtils.hideLoadingIndicator();
            }));
        },

        /**
        * This function is used to get all the attachments
        * @memberOf widgets/details-panel/inspections
        */
        _getAllAttachments: function () {
            var deferredList, deferredListArr, i;
            deferredListArr = [];
            for (i = 0; i < this._entireInspectionsArr.length; i++) {
                deferredListArr.push(this._inspectionsTable.queryAttachmentInfos(this._entireInspectionsArr[i][1].features[0].attributes[this.selectedOperationalLayer.objectIdField]));
            }
            deferredList = new DeferredList(deferredListArr);
            deferredList.then(lang.hitch(this, function (response) {
                this._entireAttachmentsArr = response;
                this._displayInspectionsAndAttachments();
            }), lang.hitch(this, function () {
                this.hideInspectionsTab();
                this.appUtils.hideLoadingIndicator();
            }));
        },

        /**
        * This function is used display inspections and attachments
        * @memberOf widgets/details-panel/inspections
        */
        _displayInspectionsAndAttachments: function () {
            var i, inspectionContentPaneContainer, inspectionContentPane, inspectionsParentDiv;
            for (i = 0; i < this._entireInspectionsArr.length; i++) {
                inspectionsParentDiv = query(".esriCTinspectionsParentDiv")[0];
                inspectionContentPaneContainer = domConstruct.create("div", { "class": "esriCTInspectionsPopup" }, inspectionsParentDiv);
                inspectionContentPane = new ContentPane({}, inspectionContentPaneContainer);
                if (!this._entireInspectionsArr[i][1].features[0].infoTemplate) {
                    this._entireInspectionsArr[i][1].features[0].setInfoTemplate(new PopupTemplate(this._inspectionPopupTable.popupInfo));
                }
                inspectionContentPane.startup();
                inspectionContentPane.set('content', this._entireInspectionsArr[i][1].features[0].getContent());
                this._checkAttachments(inspectionContentPaneContainer, i);
                this._createInspectionButton(inspectionContentPaneContainer, this._entireInspectionsArr[i][1].features[0]);
                this._deleteInspectionButton(inspectionContentPaneContainer, this._entireInspectionsArr[i][1].features[0]);
            }
            this.showInspectionsTab();
            domAttr.set(dom.byId("inspectionsTotalCount"), "innerHTML", "(" + this._entireInspectionsArr.length + ")");
            this.appUtils.hideLoadingIndicator();
        },

        /**
        * This function is used to check whether one of the field is editable or not
        * @memberOf widgets/details-panel/inspections
        */
        _hasEditableField: function () {
            var hasEditableField = false, k;
            if (this._inspectionPopupTable && this._inspectionPopupTable.popupInfo) {
                for (k = 0; k < this._inspectionPopupTable.popupInfo.fieldInfos.length; k++) {
                    if (this._inspectionPopupTable.popupInfo.fieldInfos[k].isEditable) {
                        hasEditableField = true;
                        break;
                    }
                }
            }
            return hasEditableField;
        },

        /**
        * This function is used to check whether inspection's field that is configured is available in inspections table or not.
        * @memberOf widgets/details-panel/inspections
        */
        _hasInspectionsField: function () {
            var k, hasInspectionField = false;
            if (this.appConfig.inspectionField) {
                // if the related table contains inspection field set inspectionIconFlag to true
                for (k = 0; k < this._inspectionsTable.fields.length; k++) {
                    if (this._inspectionsTable.fields[k].name === this.appConfig.inspectionField) {
                        hasInspectionField = true;
                        break;
                    }
                }
            }
            return hasInspectionField;
        },

        /**
        * This function is used to create common popup inspection contents
        * @memberOf widgets/details-panel/inspections
        */
        _createPopUpContent: function (currentFeature) {
            var queryFeature, currentDateTime = new Date().getTime();
            queryFeature = new Query();
            queryFeature.objectIds = [parseInt(currentFeature.attributes[this.selectedOperationalLayer.objectIdField], 10)];
            queryFeature.outFields = ["*"];
            queryFeature.where = currentDateTime + "=" + currentDateTime;
            this._inspectionsTable.setInfoTemplate(new PopupTemplate(this._inspectionPopupTable.popupInfo));
            return this._inspectionsTable.queryFeatures(queryFeature);
        },

        /**
        * Check whether attachments are available in layer and enabled in webmap
        * @memberOf widgets/details-panel/inspections
        **/
        _checkAttachments: function (inspectionContentPaneContainer, index) {
            if (this._inspectionsTable.hasAttachments) {
                var attachmentsDiv = $(".attachmentsSection", inspectionContentPaneContainer)[0];
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
        * @memberOf widgets/details-panel/inspections
        **/
        _showAttachments: function (attachmentContainer, index) {
            var fieldContent, i, attachment, deleteAttachmentContainer, attachmentWrapper, imageThumbnailContainer, imageThumbnailContent, imageContainer, fileTypeContainer, isAttachmentAvailable, imagePath, imageDiv;
            //check if attachments found
            if (this._entireAttachmentsArr[index][1] && this._entireAttachmentsArr[index][1].length > 0) {
                //Create attachment header text
                domConstruct.create("div", { "innerHTML": this.appConfig.i18n.inspection.attachmentHeaderText, "class": "esriCTAttachmentHeader" }, attachmentContainer);
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
        * @memberOf widgets/details-panel/inspections
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
            inspectionsParentDiv = query(".esriCTinspectionsParentDiv")[0];
            domConstruct.empty(inspectionsParentDiv);
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
        * @memberOf widgets/details-panel/inspections
        **/
        _fetchDocumentContentType: function (attachmentData, fileTypeContainer) {
            var typeText, fileExtensionRegEx, fileExtension;
            fileExtensionRegEx = /(?:\.([^.]+))?$/; //ignore jslint
            fileExtension = fileExtensionRegEx.exec(attachmentData.name);
            if (fileExtension && fileExtension[1]) {
                typeText = "." + fileExtension[1].toUpperCase();
            } else {
                typeText = this.appConfig.i18n.inspection.unknownInspectionAttachment;
            }
            domAttr.set(fileTypeContainer, "innerHTML", typeText);
        },

        /**
        * Function to fetch document name
        * @param{object} attachment object
        * @param{object} dom node
        * @memberOf widgets/details-panel/inspections
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
        * @memberOf widgets/details-panel/inspections
        **/
        _displayImageAttachments: function (evt) {
            window.open(domAttr.get(evt.currentTarget, "alt"));
        },

        /**
        * This function is used to create edit inspections button
        * @memberOf widgets/details-panel/inspections
        */
        _createInspectionButton: function (parentDiv, graphic) {
            var inspectionBtnDiv;
            inspectionBtnDiv = domConstruct.create("div", {
              "class": "esriCTInspectionButton esrictfonticons esrictfonticons-pencil esriCTBodyTextColor",
              "title": this.appConfig.i18n.detailsPanel.editContentText
            }, parentDiv);
            on(inspectionBtnDiv, "click", lang.hitch(this, function () {
                if (this.appConfig.logInDetails.canEditFeatures) {
                    this.appUtils.showLoadingIndicator();
                    domClass.add(this.addInspectionsBtnWrapperContainer, "esriCTHidden");
                    this._createInspectionForm(graphic, false);
                    domStyle.set(this.inspectionsContainer, "display", "none");
                    $('#tabContent').animate({
                        scrollTop: 0
                    });
                } else {
                    this.appUtils.showMessage(this.appConfig.i18n.inspection.unableToAddOrEditInspectionMessage);
                }
            }));
        },

        /**
        * This function is used to create delete inspections button
        * @memberOf widgets/details-panel/inspections
        */
        _deleteInspectionButton: function (parentDiv, graphic) {
            var deleteInspectionBtnDiv;
            deleteInspectionBtnDiv = domConstruct.create("div", {
              "class": "btn btn-sm btn-danger esriCTDeleteInspectionButton",
              "innerHTML": this.appConfig.i18n.detailsPanel.delete,
              "title": this.appConfig.i18n.detailsPanel.deleteContentText
            }, parentDiv);
            domConstruct.create("span", {"class": "glyphicon glyphicon-trash"}, deleteInspectionBtnDiv, "first");
            on(deleteInspectionBtnDiv, "click", lang.hitch(this, function () {

              console.log(graphic.attributes.OBJECTID);
              if (confirm(this.appConfig.i18n.detailsPanel.verifyDelete)) {

                this.appUtils.showLoadingIndicator();
                this._inspectionsTable.applyEdits(null, null, [graphic], lang.hitch(this, function () { //ignore jslint
                  domConstruct.empty(this.inspectionsContainer);
                  domStyle.set(this.inspectionsContainer, "display", "block");
                  this._showInspections(this.multipleFeatures[0], this.inspectionsContainer);
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
        * This function is used hide inspections Tab
        * @memberOf widgets/details-panel/inspections
        */
        hideInspectionsTab: function () {
            return;
        },

        /**
        * This function is used show inspections Tab
        * @memberOf widgets/details-panel/inspections
        */
        showInspectionsTab: function () {
            return;
        },

        /**
        * Instantiate inspection-form widget
        * @param {object} item contains selected feature object
        * @memberOf widgets/details-panel/inspections
        */
        _createInspectionForm: function (item, addInspections) {
            if (this._inspectionformInstance) {
                this._inspectionformInstance.destroy();
            }
            domConstruct.empty(dom.byId("inspectionformContainer"));
            //Create new instance of InspectionForm
            this._inspectionformInstance = new InspectionForm({
                config: this.appConfig,
                inspectionTable: this._inspectionsTable,
                inspectionPopupTable: this._inspectionPopupTable,
                itemInfos: this.itemInfo,
                appUtils: this.appUtils,
                nls: this.appConfig.i18n,
                item: item,
                selectedLayer: this.selectedOperationalLayer,
                addInspections: addInspections
            }, domConstruct.create("div", {}, dom.byId("inspectionformContainer")));

            // attach cancel button click event
            this._inspectionformInstance.onCancelButtonClick = lang.hitch(this, function () {
                this._showPanel(dom.byId("inspectionformContainer"));
                // display add inspection button
                domClass.remove(this.addInspectionsBtnWrapperContainer, "esriCTHidden");
                this.isInspectionFormOpen = false;
                //Check if application is running on android devices, and show/hide the details panel
                //This resolves the jumbling of content in details panel on android devices
                if (this.appUtils.isAndroid()) {
                    this.toggleDetailsPanel();
                }
                domStyle.set(this.inspectionsContainer, "display", "block");
                //Scroll to top position when clicked cancel need ID to use scrollTop
                dom.byId("tabContent").scrollTop = 0;
                this.appUtils.hideLoadingIndicator();
            });
            this._inspectionformInstance.onInspectionFormSubmitted = lang.hitch(this, function () {
                //close the inspection form after submitting new inspection
                this._showPanel(dom.byId("inspectionformContainer"));
                // display add inspection button
                domClass.remove(this.addInspectionsBtnWrapperContainer, "esriCTHidden");
                this.isInspectionFormOpen = false;
                //update inspection list
                domConstruct.empty(this.inspectionsContainer);
                domStyle.set(this.inspectionsContainer, "display", "block");
                this._showInspections(this.multipleFeatures[0], this.inspectionsContainer);
                // this.appUtils.hideLoadingIndicator();
            });
            this._showPanel(dom.byId("inspectionformContainer"));
            //If Inspection form is close, update the inspection form open flag
            if (domClass.contains(dom.byId("inspectionformContainer"), "esriCTHidden")) {
                if (this.appUtils.isAndroid()) {
                    this.toggleDetailsPanel();
                }
                this.isInspectionFormOpen = false;
            } else {
                this.isInspectionFormOpen = true;
            }
        },

        /**
        * shows and hides the div content
        * @memberOf widgets/details-panel/inspections
        */
        _showPanel: function (domNode) {
            if (domClass.contains(domNode, "esriCTHidden")) {
                domClass.remove(domNode, "esriCTHidden");
            } else {
                domClass.add(domNode, "esriCTHidden");
            }
        },

        /**
        * Empties the list of inspections.
        * @memberOf widgets/details-panel/inspections
        */
        _clearInspections: function () {
            domConstruct.empty(this.inspectionsList);
            domConstruct.empty(this.noInspectionsDiv);
        },

        /**
        * This function is used to attach click event to add inspection button
        * @memberOf widgets/details-panel/inspections
        */
        _attachEventToAddInspectionButton: function () {
            if (this._addInspectionBtnClickHandle) {
                this._addInspectionBtnClickHandle.remove();
            }
            if (this.addInspectionsBtnWrapperContainer) {
                this._addInspectionBtnClickHandle = on(this.addInspectionsBtnWrapperContainer, "click",
                lang.hitch(this, function () {
                  if (this.appConfig.logInDetails.canEditFeatures) {
                    this.appUtils.showLoadingIndicator();
                    this._openAddInspectionsForm();
                  } else {
                    this.appUtils.showMessage(this.appConfig.i18n.inspection.unableToAddOrEditInspectionMessage);
                  }
                }));
            }
        },

        /**
        * This function is used to open add inspections form
        * @memberOf widgets/details-panel/inspections
        */
        _openAddInspectionsForm: function () {
            var item = {};
            domStyle.set(this.inspectionsContainer, "display", "none");
            domClass.add(this.addInspectionsBtnWrapperContainer, "esriCTHidden");
            item.attributes = {};
            // Initialize the related keyfield value as default
            item.attributes[this.selectedOperationalLayer.relationships[1].keyField] = this.multipleFeatures[0].attributes[this.selectedOperationalLayer.relationships[1].keyField];
            this._createInspectionForm(item, true);
        },

        /**
        * This function is used to create popup template for single field
        * @param {object} currentFeature contains selected feature object
        * @memberOf widgets/details-panel/inspections
        */
        _createPopUpForSingleField: function (currentFeature) {
            var popupInfo = {}, k, singlefieldInspection;
            popupInfo.fieldInfos = [];
            popupInfo.mediaInfos = [];
            popupInfo.showAttachments = false;
            popupInfo.title = "";
            for (k = 0; k < this._inspectionsTable.fields.length; k++) {
                if (this._inspectionsTable.fields[k].name === this.appConfig.inspectionField && this._inspectionsTable.fields[k].editable && this._inspectionsTable.fields[k].type === "esriFieldTypeString") {
                    popupInfo.fieldInfos.push({
                        fieldName: this._inspectionsTable.fields[k].name,
                        format: null,
                        isEditable: this._inspectionsTable.fields[k].editable,
                        label: this._inspectionsTable.fields[k].alias,
                        stringFieldOption: "textarea",
                        tooltip: "",
                        visible: true
                    });
                    if (currentFeature) {
                        //check for blank single field inspection and handle space for pencil icon
                        singlefieldInspection = currentFeature.attributes[this.appConfig.inspectionField];
                        if (singlefieldInspection && singlefieldInspection !== "") {
                            popupInfo.description = "{" + this.appConfig.inspectionField + "}" + "\n <div class='inspectionRow'></div>";
                        } else {
                            popupInfo.description = "{" + this.appConfig.inspectionField + "}" + "\n <div class='inspectionRow'>&nbsp</div>";
                        }
                    }
                    break;
                }
            }
            this._inspectionPopupTable.popupInfo = popupInfo;
        },

        /**
        * sets the inspections associated with an item.
        * @param {array} inspectionsArr contains related features array
        * @memberOf widgets/details-panel/inspections
        */
        _setInspections: function (inspectionsArr) {
            domConstruct.empty(this.inspectionsContainer);
            arrayUtil.forEach(inspectionsArr, lang.hitch(this, this._buildInspectionDiv));
        },

        /**
        * display popup info for related features
        * @param {object} item is selected related feature
        * @memberOf widgets/details-panel/inspections
        */
        _buildInspectionDiv: function (item) {
            var inspectionDiv;
            inspectionDiv = domConstruct.create('div', { 'class': 'inspection' }, this.inspectionsContainer);
            new ContentPane({ 'class': 'content small-text', 'content': item.getContent() }, inspectionDiv).startup();
        }
    });
});
