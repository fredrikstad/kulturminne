/*global define,setTimeout,window,dojo,$ */
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
    "dojo/_base/lang",
    "dojo/_base/array",
    "dojo/_base/event",
    "dojo/dom",
    "dojo/dom-style",
    "dojo/dom-construct",
    "dojo/on",
    "dojo/string",
    "application/utils/utils",
    "widgets/app-header/app-header",
    "widgets/map-viewer/map-viewer",
    "widgets/webmap-list/webmap-list",
    "widgets/geo-form/geo-form",
    "esri/layers/GraphicsLayer",
    "esri/graphic",
    "esri/geometry/Point",
    "esri/geometry/Polyline",
    "esri/geometry/Polygon",
    "esri/SpatialReference",
    "esri/symbols/SimpleMarkerSymbol",
    "esri/symbols/SimpleLineSymbol",
    "esri/symbols/SimpleFillSymbol",
    "esri/symbols/PictureMarkerSymbol",
    "esri/tasks/query",
    "esri/toolbars/edit",
    "esri/toolbars/draw",
    "widgets/data-viewer/data-viewer",
    "dojo/dom-class",
    "esri/layers/FeatureLayer",
    "widgets/time-slider/time-slider",
    "widgets/details-panel/details-panel",
    "esri/tasks/query",
    "dojo/query",
    "esri/dijit/PopupTemplate",
    "dojo/dom-attr",
    "dojo/dom-geometry",
    "dojo/domReady!"
], function (
    declare,
    lang,
    array,
    event,
    dom,
    domStyle,
    domConstruct,
    on,
    string,
    ApplicationUtils,
    ApplicationHeader,
    MapViewer,
    WebMapList,
    GeoForm,
    GraphicsLayer,
    Graphic,
    Point,
    Polyline,
    Polygon,
    SpatialReference,
    SimpleMarkerSymbol,
    SimpleLineSymbol,
    SimpleFillSymbol,
    PictureMarkerSymbol,
    Query,
    Edit,
    Draw,
    DataViewer,
    domClass,
    FeatureLayer,
    TimeSlider,
    DetailsPanel,
    EsriQuery,
    query,
    PopupTemplate,
    domAttr,
    domGeom
) {
    return declare(null, {

        _boilerPlateTemplate: null, // to store object of boilerplate
        _loggedInUser: null, // to store details of logged in user
        _applicationHeader: null, // to store object of application header widget
        _webMapListWidget: null, // to store object of webmap list widget
        _timeSliderWidget: null, // to store object of time slider widget
        _dataViewerWidget: null, // to store object of data viewer widget
        _detailsPanelWidget: null, // to store object of details panel widget
        _existingDefinitionExpression: null, // to store existing definition expression of layer,
        _dataViewerFeatureLayerUpdateEndHandle: null, // update end handle of feature layer
        _itemInfo: null, // to store item info of webmap
        _mapPanelWidget: null, // to store object of map panel widget
        _layerSelectionDetails: null, // to store details when new operational layer is selected
        _selectRowGraphicsClickHandle: null, // graphics click handle to select a feature
        _refinedOperationalLayer: null, // to store object of layer which is added in snapshot mode
        _timeInfo: null, // to store time info object of a layer
        _mapResizeHandle: null, // to store resize handle of a map
        _mapClickHandle: null, // to store click handle of a map
        _isManualRefreshedClicked: false, // to keep track whether to do manual refresh or not
        _manualRefreshDataObj: null, // to store data needed for manual refresh
        _mapZoomInHandle: null, // to store zoom in handle of map panel
        _mapZoomOutHandle: null, // to store zoom out handle of map panel
        _filterRefreshDataObj: null,
        _isFilterRefreshClicked: false,
        _existingLayerIndex: null, // to store index of layer
        _reorderLayers: false, // flag to reorder layers
        _isGraphicLayerClicked: false, // to track whether graphic layer is clicked or not
        _isShowSelectedClicked: false,
        _disableTimeSliderClickHandle: null, // to store handle of disable time slider
        _editToolbar: null,
        _editingEnabled: false,
        _editedObjectID: null,

        /**
         * This method is designed to handle processing after any
         * DOM fragments have been actually added to the document.
         * @param{object} boilerplate template object
         * @param{object} logged in user details
         * @memberOf widgets/main/main
         */
        startup: function (boilerPlateTemplateObject, loggedInUser) {
            this._loggedInUser = loggedInUser;
            var queryParams = {};
            // config will contain application and user defined info for the
            // template such as i18n strings, the web map id
            // and application id
            // any url parameters and any application specific configuration information.
            if (boilerPlateTemplateObject) {
                this._boilerPlateTemplate = boilerPlateTemplateObject;
                this.appConfig = boilerPlateTemplateObject.config;

                this.appUtils = ApplicationUtils;//Create esri geocoder instance, this will be needed in the process of reverse geocoding
                this.appUtils.createGeocoderInstance(this.appConfig);

                // if login details are not available set it to anonymousUserName
                if (this._loggedInUser) {
                    this.appConfig.logInDetails = {
                        "userName": this._loggedInUser.fullName,
                        "token": this._loggedInUser.credential.token,
                        "canEditFeatures": this._checkUserPrivileges()
                    };
                    queryParams.token = this._loggedInUser.credential.token;
                } else {
                    this.appConfig.logInDetails = {
                        "userName": this.appConfig.i18n.applicationHeader.signInOption,
                        "token": "",
                        "canEditFeatures": true
                    };
                }
                // enable queryForGroupItems in templateconfig
                this._boilerPlateTemplate.templateConfig.queryForGroupItems = true;
                // construct the query params. If found in group info mixin configured group params
                // so that in case of private group where we dont get the group info,
                // items will be loaded as configured in templateconfig
                lang.mixin(queryParams, this._boilerPlateTemplate.templateConfig.groupParams);
                if (this.appConfig.groupInfo.results && this.appConfig.groupInfo.results.length > 0) {
                    if (this.appConfig.groupInfo.results[0].sortField) {
                        queryParams.sortField = this.appConfig.groupInfo.results[0].sortField;
                    }
                    if (this.appConfig.groupInfo.results[0].sortOrder) {
                        queryParams.sortOrder = this.appConfig.groupInfo.results[0].sortOrder;
                    }
                }
                // pass the newly constructed queryparams from groupinfo.
                // if query params not available in groupinfo or group is private
                // items will be sorted according to modified date.
                this._groupItems = [];
                this._loadGroupItems(queryParams);
            } else {
                ApplicationUtils.showError(this.appConfig.i18n.config.configNotDefined);
            }
        },

        /**
         * This function is used to load group items
         * @param{object} parameter used to query group items
         * @memberOf widgets/main/main
         */
        _loadGroupItems: function (queryParams) {
            this._boilerPlateTemplate.queryGroupItems(queryParams).then(lang.hitch(this, this._groupItemsLoaded));
        },

        /**
         * This function is executed when group items are loaded
         * @param{object} response once group item are loaded
         * @memberOf widgets/main/main
         */
        _groupItemsLoaded: function (response) {
            this._groupItems.push.apply(this._groupItems, response.groupItems.results);
            if (response.groupItems.nextQueryParams.start < 0) {
                if (!this.appConfig.groupItems) {
                    this.appConfig.groupItems = {};
                }
                this.appConfig.groupItems.results = this._groupItems;
                this._loadApplication();

            } else {
                this._loadGroupItems(response.groupItems.nextQueryParams);
            }
        },

        /**
         * This function is used to load application
         * @memberOf widgets/main/main
         */
        _loadApplication: function () {
            if (this.appConfig.groupItems.results.length > 0) {
                domClass.remove("UpperAndLowerWrapperContainer", "esriCTHidden");
                domClass.add("signInErrorMessageContainer", "esriCTHidden");
                // executes when window is resized
                on(window, "resize", lang.hitch(this, this._onWindowResize));
                // executes when window is resized
                on(window, "orientationchange", lang.hitch(this, function () {
                    if (ApplicationUtils.isAndroid()) {
                        $(".esriCTFilterParentContainer").css("display", "none");
                    }
                    if (query(".tab-content")[0]) {
                        domStyle.set("carouselInnerContainer", "height", (query(".tab-content")[0].clientHeight - 75) + "px");
                    }
                    if (this._detailsPanelWidget) {
                        this._detailsPanelWidget.resizeChart();
                    }
                }));
                // set Application Theme
                ApplicationUtils.loadApplicationTheme(this.appConfig);
                // create Application header
                this._createApplicationHeader();
                // create map panel
                this._createMapPanel();
                // to instantiate resize handle
                this._resizeUpperAndLowerContainer();
                // load web map list
                domClass.add(dom.byId("noWebMapParentContainer"), "esriCTHidden");
                domClass.remove(dom.byId("mainWrapperContainer"), "esriCTHidden");
                // create webmap list
                this._createWebMapList();
                this._handleEmptyDetailsPanel();
                this._handleEmptyDataViewerPanel();
                this._attachClickEventToDetailsPanel();
                this._attachClickEventToApplicationHeader();
                this._attachClickEventToOperationalLayerName();
            } else {
                // executes when window is resized
                on(window, "resize", lang.hitch(this, this._onWindowResize));
                // set Application Theme
                ApplicationUtils.loadApplicationTheme(this.appConfig);
                // create Application header
                this._createApplicationHeader(true);
                // create map panel
                this._createMapPanel();
                // handle case when there id no webmap to display
                this._handleNoWebMapToDisplay();
            }
        },

        /**
         * This function is used to attach click event to details panel for closing filter UI.
         * On click of details panel hide webmap list
         * @memberOf widgets/main/main
         */
        _attachClickEventToDetailsPanel: function () {
            on(dom.byId("detailsPanelWrapperContainer"), "click", lang.hitch(this, function () {
                $(".esriCTFilterParentContainer").css("display", "none");
                if ((!domClass.contains("webmapListToggleButton", "esriCTWebMapPanelToggleButtonOpenDisabled")) && (!domClass.contains("webmapListToggleButton", "esriCTWebMapPanelToggleButtonCloseDisabled"))) {
                    this._webMapListWidget.hideWebMapList();
                }
            }));

        },

        /**
         * This function is used to attach click event to application header for closing filter UI.
         * @memberOf widgets/main/main
         */
        _attachClickEventToApplicationHeader: function () {
            on(dom.byId("applicationHeaderWrapperContainer"), "click", lang.hitch(this, function () {
                $(".esriCTFilterParentContainer").css("display", "none");
            }));
        },

        /**
         * This function is used to attach click event to operational name container for closing filter UI.
         * @memberOf widgets/main/main
         */
        _attachClickEventToOperationalLayerName: function () {
            on(dom.byId("operationalLayerNameContainer"), "click", lang.hitch(this, function () {
                $(".esriCTFilterParentContainer").css("display", "none");
            }));
        },

        /**
         * This function is executed when window is resized
         * @memberOf widgets/main/main
         */
        _onWindowResize: function () {
            if (this._applicationHeader) {
                this._applicationHeader._setWidthOfApplicationNameContainer();
            }
            this._setNoDataDataViewerMessagePosition();
            if (!ApplicationUtils.isAndroid()) {
                $(".esriCTFilterParentContainer").css("display", "none");
            }
            setTimeout(lang.hitch(this, function () {
                var datePickerDialogBox, datePickerDialogBoxPosition;
                datePickerDialogBox = query(".bootstrap-datetimepicker-widget.dropdown-menu")[0];
                if (datePickerDialogBox) {
                    datePickerDialogBoxPosition = domGeom.position(datePickerDialogBox, true);
                    domConstruct.place(datePickerDialogBox, dojo.body(), "first");
                    domStyle.set(datePickerDialogBox, "position", "absolute");
                    domStyle.set(datePickerDialogBox, "top", (datePickerDialogBoxPosition.y + "px"));
                    domStyle.set(datePickerDialogBox, "left", (datePickerDialogBoxPosition.x + "px"));
                    domStyle.set(datePickerDialogBox, "height", (datePickerDialogBoxPosition.h + "px"));
                }
            }), 200);
            this._resizeMap();
        },

        /**
         * This function is used to instantiate application header.
         * @memberOf widgets/main/main
         */
        _createApplicationHeader: function (displaySignInText) {
            var appHeaderParameter;
            this._destroyApplicationHeaderWidget();
            // parameters needed to instantiate application header
            appHeaderParameter = {
                "appConfig": this.appConfig,
                "appUtils": ApplicationUtils,
                "loggedInUser": this._loggedInUser,
                "displaySignInText": displaySignInText
            };
            // loading application header
            this._applicationHeader = new ApplicationHeader(appHeaderParameter, domConstruct.create("div", {}, dom.byId('applicationHeaderWrapperContainer')));
            this._attachApplicationHeaderEventListener();
            this._applicationHeader.startup();
        },

        /**
         * This function is used to attach event listener to application header widget
         * @memberOf widgets/main/main
         */
        _attachApplicationHeaderEventListener: function () {
            this._applicationHeader.hideWebMapList = lang.hitch(this, function () {
                if ((!domClass.contains("webmapListToggleButton", "esriCTWebMapPanelToggleButtonOpenDisabled")) && (!domClass.contains("webmapListToggleButton", "esriCTWebMapPanelToggleButtonCloseDisabled"))) {
                    if (this._webMapListWidget) {
                        this._webMapListWidget.hideWebMapList();
                    }
                }
            });
            this._applicationHeader.confirmedManualRefresh = lang.hitch(this, function () {
                this._isManualRefreshedClicked = true;
                this._dataViewerWidget.isShowSelectedClicked = false;
                this._dataViewerWidget.isShowAllClicked = false;
                this._dataViewerWidget.storeDataForManualRefresh();
            });
            this._applicationHeader.reload = lang.hitch(this, function (logInDetails) {
                this._reloadSignedInUserDetails = logInDetails;
            });
            this._applicationHeader.destroyWidgets = lang.hitch(this, function () {
                ApplicationUtils.showLoadingIndicator();
                ApplicationUtils.showOverlayContainer();
                this._destroyWidgets();
                this.reload(this._reloadSignedInUserDetails);
            });
            this._applicationHeader.onSearchApplied = lang.hitch(this, function (lastSearchedString) {
                this.appConfig._filterObject.lastSearchedString = lastSearchedString;
            });
            this._applicationHeader.showAllClicked = lang.hitch(this, function () {
                this._showAllRecords();
            });
            this._applicationHeader.showSelectedClicked = lang.hitch(this, function () {
                this._dataViewerWidget.isShowSelectedClicked = true;
                this._dataViewerWidget.isShowAllClicked = false;
                this._detailsPanelWidget.showSelectedClicked();
                if (this._timeSliderWidget) {
                    this._timeSliderWidget.handleTimeSliderVisibility(2);
                }
                this._applicationHeader.disableSearchIcon();
                this._dataViewerWidget.createDataViewerUI(false);
            });
        },

        /**
         * This method is used to reload the app
         * @memberOf widgets/main/main
         */
        reload: function (logInDetails) {
            return logInDetails;
        },

        /**
         * This function is used to destroy all the widgets.
         * @memberOf widgets/main/main
         */
        _destroyWidgets: function () {
            this._destroyApplicationHeaderWidget();
            this._destroyWebMapPanelWidget();
            this._destroyTimeSliderWidget();
            this._destroyDataViewerWidget();
            this._destroyDetailsPanelWidget();
            this._destroyMapPanelWidget();
        },

        /**
         * This function is used to destroy application header widget.
         * @memberOf widgets/main/main
         */
        _destroyApplicationHeaderWidget: function () {
            if (this._applicationHeader) {
                this._applicationHeader.destroy();
            }
        },

        /**
         * This function is used to destroy webmap panel widget.
         * @memberOf widgets/main/main
         */
        _destroyWebMapPanelWidget: function () {
            if (this._webMapListWidget) {
                this._webMapListWidget.destroy();
            }
        },

        /**
         * This function is used to instantiate map panel
         * @memberOf widgets/main/main
         */
        _createMapPanel: function () {
            var mapViewerParameter;
            // parameters needed for instantiate map viewer panel
            mapViewerParameter = {
                "appConfig": this.appConfig,
                "appUtils": ApplicationUtils
            };
            // load map viewer panel
            this._mapPanelWidget = new MapViewer(mapViewerParameter, domConstruct.create("div", {}, dom.byId("mapPanelWrapperContainer")));
        },

        /**
         * This function is used to destroy map panel widget
         * @memberOf widgets/main/main
         */
        _destroyMapPanelWidget: function () {
            if (this._mapPanelWidget) {
                this._mapPanelWidget.destroy();
            }
        },

        /**
         * This function is used to instantiate webMapList widget.
         * @memberOf widgets/main/main
         */
        _createWebMapList: function () {
            var webMapDescriptionFields, webMapListConfigData;
            this._addWebMapListToggleIcon();
            // hide/show info fields of web-map
            webMapDescriptionFields = {
                "description": this.appConfig.webMapInfoDescription,
                "snippet": this.appConfig.webMapInfoSnippet,
                "owner": this.appConfig.webMapInfoOwner,
                "created": this.appConfig.webMapInfoCreated,
                "modified": this.appConfig.webMapInfoModified,
                "licenseInfo": this.appConfig.webMapInfoLicenseInfo,
                "accessInformation": this.appConfig.webMapInfoAccessInformation,
                "tags": this.appConfig.webMapInfoTags,
                "numViews": this.appConfig.webMapInfoNumViews,
                "avgRating": this.appConfig.webMapInfoAvgRating
            };
            // parameters needed for instantiate web-map list widget
            webMapListConfigData = {
                "webMapDescriptionFields": webMapDescriptionFields,
                "appConfig": this.appConfig,
                "mapDivID": "mapDiv",
                "appUtils": ApplicationUtils,
                "changeExtentOnLayerChange": false,
                "autoResize": false
            };
            // instantiate web-map list widget
            this._webMapListWidget = new WebMapList(webMapListConfigData, domConstruct.create("div", {}, dom.byId('webMapListContainer')));
            this._attachWebMapListEventListener();
            this._webMapListWidget.startup();
        },

        /**
         * This function is used listen events raised by webmap list widget
         * @memberOf widgets/main/main
         */
        _attachWebMapListEventListener: function () {
            var timeAnimation;
            // when new operational layer is selected show it in data-viewer
            this._webMapListWidget.onOperationalLayerSelected = lang.hitch(this, function (details) {
                setTimeout(lang.hitch(this, function () {
                    ApplicationUtils.showLoadingIndicator();
                    ApplicationUtils.hideOverlayContainer();
                    this._applicationHeader.disableSelectionOptionsIcon();
                    this._reorderLayers = true;
                    $(".esriCTSignOutOption").addClass("esriCTHidden");
                    this._resetUpperAndLowerContainer();
                    // Reset last updated feature array
                    this.updatedFeature = null;
                    // Reset filter state object for a new layer
                    // Filter state object will always became empty when a new operational layer
                    // is selected from the list
                    this.appConfig._filterObject = null;
                    if (this.appConfig.i18n.direction === "rtl") {
                        //Remove disable class from webmap list toggle button
                        domClass.replace(dom.byId("webmapListToggleButton"), "esriCTPointerCursor", "esriCTWebMapPanelToggleButtonCloseDisabled");
                    } else {
                        //Remove disable class from webmap list toggle button
                        domClass.replace(dom.byId("webmapListToggleButton"), "esriCTPointerCursor", "esriCTWebMapPanelToggleButtonOpenDisabled");
                    }
                    if ((!domClass.contains("webmapListToggleButton", "esriCTWebMapPanelToggleButtonOpenDisabled")) && (!domClass.contains("webmapListToggleButton", "esriCTWebMapPanelToggleButtonCloseDisabled"))) {
                        this._webMapListWidget.hideWebMapList();
                    }
                    this._toggleNoFeatureFoundDiv(true);
                    this.map = details.map;

                    // Create instance of Draw tool to draw the graphics on graphics layer
                    this.toolbar = new Draw(this.map);
                    this.newlyAddedFeatures = [];
                    this._selectedMapDetails = details;
                    this._layerSelectionDetails = details;
                    this._itemInfo = details.itemInfo;
                    this._timeInfo = details.operationalLayerDetails.layerObject.timeInfo;
                    this._isManualRefreshedClicked = false;
                    this._isFilterRefreshClicked = false;
                    //destroy time slider instance
                    this._destroyTimeSliderWidget();
                    this._addOperationalLayerInSnapShotMode();
                    //Reset application header and search widget flags
                    if (this._applicationHeader) {
                        this._applicationHeader._isMultipleRecordsSelected = false;
                        this._applicationHeader.isSearchActive = false;
                    }
                    this._enableHeaderIcons();
                    this._setApplicationHeaderTitle();
                    this._setGeoFormButton();
                    this._attachMapEvents();
                    this._removeFeatureLayerHandle();
                    this._createFeatureLayerHandle();
                    timeAnimation = this._checkTimeAnimation(this._itemInfo.itemData);
                    if (this._timeInfo && this._itemInfo.itemData.widgets && this._itemInfo.itemData.widgets.timeSlider && this._itemInfo.itemData.widgets.timeSlider.properties && timeAnimation) {
                        this._displayContainerOfTimeSlider();
                        this._createTimeSlider();
                    } else {
                        this._destroyTimeSliderWidget();
                        this._hideContainerOfTimeSlider();
                    }
                    this.map.addLayer(this._refinedOperationalLayer, this._existingLayerIndex);
                }), 10);
            });
            // show message when there is no web map to display
            this._webMapListWidget.noMapsFound = lang.hitch(this, function () {
                this._handleNoWebMapToDisplay();
            });
            // to disable header icons
            this._webMapListWidget.displayInitialLoad = lang.hitch(this, function () {
                this._setFeatureLayerCountLabel();
                dom.byId("operationalLayerName").innerHTML = "";
                this._disableHeaderIcons();
            });
        },

        /**
         * This function is used to reset the height of upper and lower container
         * @memberOf widgets/main/main
         */
        _resetUpperAndLowerContainer: function () {
            $("#upperContainer").height('45%');
            $("#lowerContainer").height('54%');
            //Resize the map after setting default height to lower and upper container
            this._resizeMap();
        },

        /**
         * This function is used to attach event listener to map
         * @memberOf widgets/main/main
         */
        _attachMapEvents: function () {
            if (this._mapResizeHandle) {
                this._mapResizeHandle.remove();
            }
            if (this._mapClickHandle) {
                this._mapClickHandle.remove();
            }
            if (this._mapZoomInHandle) {
                this._mapZoomInHandle.remove();
            }
            if (this._mapZoomOutHandle) {
                this._mapZoomOutHandle.remove();
            }

            this._mapResizeHandle = on(this.map, "resize", lang.hitch(this, function () {
                this._resizeMap();
            }));

            this._mapZoomInHandle = on(query(".esriSimpleSliderIncrementButton")[0], "click", lang.hitch(this, function () {
                $(".esriCTFilterParentContainer").css("display", "none");
                if ((!domClass.contains("webmapListToggleButton", "esriCTWebMapPanelToggleButtonOpenDisabled")) && (!domClass.contains("webmapListToggleButton", "esriCTWebMapPanelToggleButtonCloseDisabled"))) {
                    this._webMapListWidget.hideWebMapList();
                }
            }));

            this._mapZoomOutHandle = on(query(".esriSimpleSliderDecrementButton")[0], "click", lang.hitch(this, function () {
                $(".esriCTFilterParentContainer").css("display", "none");
                if ((!domClass.contains("webmapListToggleButton", "esriCTWebMapPanelToggleButtonOpenDisabled")) && (!domClass.contains("webmapListToggleButton", "esriCTWebMapPanelToggleButtonCloseDisabled"))) {
                    this._webMapListWidget.hideWebMapList();
                }
            }));

            // esri's edit toolbar is used to move a feature. The editing is activated/deactivated by clicking the feature.
            var editToolbar, editingEnabled;
            this._editToolbar = new Edit(this.map);
            on(this._editToolbar, "deactivate", lang.hitch(this, function(evt) {
              if (evt.info.isModified) {
                this._refinedOperationalLayer.applyEdits(null, [evt.graphic], null);
              }
            }));

            this._disableEdit = function () {
              this._editingEnabled = false;
              console.log("edit deactivated");
              this._editToolbar.deactivate();
              this._refinedOperationalLayer.clearSelection();
            }
            this._enableEdit = function (event) {
              this._editingEnabled = true;
              console.log("edit activated");
              this._editToolbar.activate(Edit.MOVE, event.graphic);
              var query = new Query();
              this._editedObjectID = event.graphic.attributes[this._refinedOperationalLayer.objectIdField];
              query.objectIds = [this._editedObjectID];
              this._refinedOperationalLayer.selectFeatures(query);
            }
            this._mapClickHandle = on(this.map, "click", lang.hitch(this, function (evt) {
                $(".esriCTFilterParentContainer").css("display", "none");
                if ((!domClass.contains("webmapListToggleButton", "esriCTWebMapPanelToggleButtonOpenDisabled")) && (!domClass.contains("webmapListToggleButton", "esriCTWebMapPanelToggleButtonCloseDisabled"))) {
                    this._webMapListWidget.hideWebMapList();
                }
                if ((evt.graphic) && (evt.graphic._layer) && ((evt.graphic._layer.id === this._refinedOperationalLayer.id) || (evt.graphic._layer.id === "selectedRowGraphicsLayer"))) {
                    // to track that feature is clicked of feature layer

                    if (this._isGraphicLayerClicked) {
                        this._dataViewerWidget.onFeatureClick(evt, true);
                        this._isGraphicLayerClicked = false;
                    } else {
                        this._dataViewerWidget.onFeatureClick(evt, false);
                    }

                    if (this._editingEnabled) {
                      this._disableEdit();
                      this._enableEdit(evt);
                    }
                    else {
                      this._enableEdit(evt);
                    }
                }
                else if (this._editingEnabled) {
                  this._disableEdit();
                }
            }));
        },

        /**
         * This function is used to enable header icons
         * @memberOf widgets/main/main
         */
        _enableHeaderIcons: function () {
            var searchParameter, manualRefreshParameter;
            searchParameter = {
                "itemInfo": this._itemInfo,
                "selectedOperationalLayerID": this._layerSelectionDetails.operationalLayerId,
                "selectedOperationalLayer": this._refinedOperationalLayer,
                "map": this.map
            };
            this._applicationHeader.toggleSearchIcon(searchParameter);
            manualRefreshParameter = {
                "selectedOperationalLayer": this._refinedOperationalLayer
            };
            this._applicationHeader.toggleManualRefreshIcon(manualRefreshParameter);
        },

        /**
         * This function is used to display the container of time slider
         * @memberOf widgets/main/main
         */
        _displayContainerOfTimeSlider: function () {
            domClass.replace(dom.byId("upperContainer"), "esriCTUpperContainer", "esriCTUpperContainerEmptySlider");
            domClass.replace(dom.byId("lowerContainer"), "esriCTLowerContainer", "esriCTLowerContainerEmptySlider");
            domClass.replace(dom.byId("dataViewerWrapperContainer"), "esriCTDataViewerWrapperContainer", "esriCTDataViewerWrapperContainerEmptySlider");
            domClass.remove(dom.byId("timeSliderWrapperContainer"), "esriCTHidden");
            this._resizeMap();
        },

        /**
         * This function is used to hide the container of time slider
         * @memberOf widgets/time-slider/time-slider
         */
        _hideContainerOfTimeSlider: function () {
            domClass.replace(dom.byId("upperContainer"), "esriCTUpperContainerEmptySlider", "esriCTUpperContainer");
            domClass.replace(dom.byId("lowerContainer"), "esriCTLowerContainerEmptySlider", "esriCTLowerContainer");
            domClass.replace(dom.byId("dataViewerWrapperContainer"), "esriCTDataViewerWrapperContainerEmptySlider", "esriCTDataViewerWrapperContainer");
            domClass.add(dom.byId("timeSliderWrapperContainer"), "esriCTHidden");
            this._resizeMap();
        },

        /**
         * This function is used to check time animation in webmap Json.
         * @param{object} parameters to check time animation
         * @memberOf widgets/main/main
         */
        _checkTimeAnimation: function (itemData) {
            var isEnableTimeAnimation = true,
                timeAnimationKey = "timeAnimation",
                i;
            for (i = 0; i < itemData.operationalLayers.length; i++) {
                if (itemData.operationalLayers[i].id === this._refinedOperationalLayer.id) {
                    if (itemData.operationalLayers[i][timeAnimationKey] === false) {
                        isEnableTimeAnimation = false;
                    }
                    break;
                }
            }
            return isEnableTimeAnimation;
        },

        /**
         * This function is used get existing index of layer
         * @memberOf widgets/main/main
         */
        _getExistingIndex: function (layerID) {
            var index, i;
            this._existingLayerIndex = null;
            for (i = 0; i < this._itemInfo.itemData.operationalLayers.length; i++) {
                if (this._itemInfo.itemData.operationalLayers[i].id === layerID) {
                    index = i + 1;
                    this._existingLayerIndex = index;
                }
            }
        },

        /**
         * This function is used add selected operational layer in snapshot mode
         * @memberOf widgets/main/main
         */
        _addOperationalLayerInSnapShotMode: function () {
            var opLayerInfo, staticDefinitionExpression, cloneRenderer, cloneLabelingInfo;
            //get selected operation layer details
            opLayerInfo = this._layerSelectionDetails.operationalLayerDetails;
            // clone renderer
            cloneRenderer = lang.clone(this.map.getLayer(opLayerInfo.id).renderer);
            // clone labeling info
            cloneLabelingInfo = lang.clone(this.map.getLayer(opLayerInfo.id).labelingInfo);
            // get index of layer
            this._getExistingIndex(opLayerInfo.id);
            //remove selected layer from map
            this.map.removeLayer(this.map.getLayer(opLayerInfo.id));
            //create feature layer in 'snapshot' mode
            this._refinedOperationalLayer = new FeatureLayer(opLayerInfo.url, {
                mode: FeatureLayer.MODE_SNAPSHOT,
                id: opLayerInfo.id,
                outFields: ["*"]
            });
            if (this.appConfig.enableFilter || !opLayerInfo.definitionEditor) {
                //set definition expression configured in webmap
                if (opLayerInfo.layerDefinition && opLayerInfo.layerDefinition.definitionExpression) {
                    this._refinedOperationalLayer.setDefinitionExpression(opLayerInfo.layerDefinition.definitionExpression);
                }
            } else {
                staticDefinitionExpression = this._extractStaticExpression(opLayerInfo);
                this._refinedOperationalLayer.setDefinitionExpression(staticDefinitionExpression);
            }
            this._refinedOperationalLayer.setRenderer(cloneRenderer);
            //set popupInfo template configured in webmap
            if (opLayerInfo.popupInfo) {
                this._refinedOperationalLayer.setInfoTemplate(new PopupTemplate(opLayerInfo.popupInfo));
            }
            //set layer opacity configured in webmap
            this._refinedOperationalLayer.setOpacity(opLayerInfo.opacity);
            // set labelling info
            if (cloneLabelingInfo) {
                this._refinedOperationalLayer.setLabelingInfo(cloneLabelingInfo);
            }

        },

        /**
         * This function is used disable header icons
         * @memberOf widgets/main/main
         */
        _disableHeaderIcons: function () {
            this._addOrganizationBaseMap();
        },

        /**
         * This function is used add first basemap of organization on initial load
         * @memberOf widgets/main/main
         */
        _addOrganizationBaseMap: function () {
            var webMapListObj, portal, params;
            webMapListObj = this._webMapListWidget;
            params = {
                q: this.appConfig.orgInfo.basemapGalleryGroupQuery
            };
            portal = this._boilerPlateTemplate.portal;
            portal.queryGroups(params).then(lang.hitch(this, function (groups) {
                if (groups && groups.results && groups.results.length > 0) {
                    params = {
                        q: "group:" + groups.results[0].id + " AND" + ' type:"Web Map" -type:"Web Mapping Application"'
                    };
                    portal.queryItems(params).then(lang.hitch(this, function (results) {
                        var baseMapID, i;
                        baseMapID = null;
                        if (results && results.results && results.results.length > 0) {
                            for (i = 0; i < results.results.length; i++) {
                                if (results.results[i].hasOwnProperty("title")) {
                                    if (results.results[i].title === this.appConfig.orgInfo.defaultBasemap.title) {
                                        baseMapID = results.results[i].id;
                                        break;
                                    }
                                }
                            }
                            if (baseMapID) {
                                webMapListObj._createMap(baseMapID, "mapDiv", true);
                            } else {
                                webMapListObj._createMap(results.results[0].id, "mapDiv");
                            }
                        }
                        ApplicationUtils.hideLoadingIndicator();
                    }));
                } else {
                    ApplicationUtils.hideLoadingIndicator();
                }
            }));
        },

        /**
         * This function is used to add webmap toggle button
         * @memberOf widgets/main/main
         */
        _addWebMapListToggleIcon: function () {
            if (this.appConfig.i18n.direction === "rtl") {
                dojo.addClass(dom.byId('webmapListToggleButton'), "esriCTWebMapPanelToggleButtonClose");
            } else {
                dojo.addClass(dom.byId('webmapListToggleButton'), "esriCTWebMapPanelToggleButtonOpen");
            }
        },

        /**
         * This function is used to handle scenario when there is no web map
         * @memberOf widgets/main/main
         */
        _handleNoWebMapToDisplay: function () {
            var error = {};
            error.message = this.appConfig.i18n.webMapList.noWebMapInGroup;
            this._displayErrorMessageScreen(error);
            ApplicationUtils.hideLoadingIndicator();
        },

        /**
         * This function is used to set application header title after selection of operational layer
         * @memberOf widgets/main/main
         */
        _setApplicationHeaderTitle: function () {
            dom.byId("operationalLayerName").innerHTML = this._layerSelectionDetails.operationalLayerDetails.title;
        },

        /**
        * This function is used to create the geoform button after selection of operational layer
        * @memberOf widgets/main/main
        */
        _setGeoFormButton: function () {
            //dom.byId("operationalLayerName").innerHTML = this._layerSelectionDetails.operationalLayerDetails.title;
            domAttr.set(dom.byId("submitFromMapText"), "innerHTML", this.appConfig.i18n.dataviewer.submitReportButtonText);
            var submitButtonColor = (this.appConfig && this.appConfig.submitReportButtonColor) ? this.appConfig.submitReportButtonColor : "#35ac46";
            domStyle.set(dom.byId("submitFromMap"), "background-color", submitButtonColor);

            on(dom.byId("submitFromMap"), "click", lang.hitch(this, function (evt) {
              this._createGeoForm();
              // handler for the hiding web map list on open GeoForm widget
              if ((!domClass.contains("webmapListToggleButton", "esriCTWebMapPanelToggleButtonOpenDisabled")) && (!domClass.contains("webmapListToggleButton", "esriCTWebMapPanelToggleButtonCloseDisabled"))) {
                  this._webMapListWidget.hideWebMapList();
              }
            }));
        },

        /**
         * This function is used to set count of total number features present in layer
         * @memberOf widgets/main/main
         */
        _setFeatureLayerCountLabel: function (graphics) {
            var count, countLabelString, selectedFeatureCountValue;
            selectedFeatureCountValue = 0;
            if (graphics && graphics.length) {
                count = graphics.length;
            } else {
                count = 0;
            }
            countLabelString = string.substitute(this.appConfig.i18n.dataviewer.layerFeatureCount, { featureCount: count, selectedFeatureCount: selectedFeatureCountValue });
            dom.byId("layerFeatureCountContainer").innerHTML = countLabelString;
        },

        /**
         * This function is used to instantiate data-viewer widget.
         * @param{object} details of newly selected layer
         * @memberOf widgets/main/main
         */
        _createDataViewer: function () {
            var dataViewerConfigData, layerDefinition;
            layerDefinition = this._layerSelectionDetails.operationalLayerDetails.layerDefinition;
            // parameters that are passed to data-viewer widget
            dataViewerConfigData = {
                "appConfig": this.appConfig,
                "map": this.map,
                "selectedOperationalLayerID": this._layerSelectionDetails.operationalLayerId,
                "selectedOperationalLayerTitle": this._layerSelectionDetails.operationalLayerDetails.title,
                "popupInfo": this._layerSelectionDetails.operationalLayerDetails.popupInfo,
                "definitionExpression": layerDefinition && layerDefinition.definitionExpression,
                "itemInfo": this._layerSelectionDetails.itemInfo,
                "lastSelectedWebMapExtent": this._webMapListWidget.lastSelectedWebMapExtent,
                "lastMapZoomLevel": this.map.getZoom(),
                "lastMapScale": this.map.getScale(),
                "appUtils": ApplicationUtils,
                "selectedOperationalLayer": this._refinedOperationalLayer,
                "isManualRefreshedClicked": this._isManualRefreshedClicked,
                "manualRefreshDataObj": this._manualRefreshDataObj,
                "updatedFeature": this.updatedFeature,
                "isFilterRefreshClicked": this._isFilterRefreshClicked,
                "filterRefreshDataObj": this._filterRefreshDataObj
            };
            this._destroyDataViewerWidget();
            this._destroyDetailsPanelWidget();
            // instantiate data-viewer widget
            this._dataViewerWidget = new DataViewer(dataViewerConfigData, domConstruct.create("div", {}, dom.byId("dataViewerWrapperContainer")));
            this._isManualRefreshedClicked = false;
            this._isFilterRefreshClicked = false;
            this.updatedFeature = null;
            this._removeDataViewerHandle();
            this._attachDataViewerEventListener();
            this._dataViewerWidget.startup(true);
        },

        /**
         * This function is used to remove handle attached with data viewer widget
         * @memberOf widgets/main/main
         */
        _removeDataViewerHandle: function () {
            if (this._selectRowGraphicsClickHandle) {
                this._selectRowGraphicsClickHandle.remove();
            }
        },

        /**
         * This function is used to listen events raised by data viewer widget
         * @memberOf widgets/main/main
         */
        _attachDataViewerEventListener: function () {
            this._dataViewerWidget.showDetailsPanel = lang.hitch(this, function (showDetailsPanelDataObj) {
                this._toggleNoFeatureFoundDiv(false);
                // create details panel
                this._createDetailsPanel(showDetailsPanelDataObj);
            });
            this._dataViewerWidget.attachEventToGraphicsLayer = lang.hitch(this, function (graphicsLayer) {
                // to select graphics on click of activated feature
                this._selectRowGraphicsClickHandle = on(graphicsLayer, "click", lang.hitch(this, function () {
                    this._isGraphicLayerClicked = true;
                    // Reset last updated feature array
                    this.updatedFeature = null;
                }));
            });
            this._dataViewerWidget.hideWebMapList = lang.hitch(this, function () {
                if ((!domClass.contains("webmapListToggleButton", "esriCTWebMapPanelToggleButtonOpenDisabled")) && (!domClass.contains("webmapListToggleButton", "esriCTWebMapPanelToggleButtonCloseDisabled"))) {
                    this._webMapListWidget.hideWebMapList();
                }
            });
            // to store data needed for manual refresh like scroll position, field order etc...
            this._dataViewerWidget.updateManualRefreshData = lang.hitch(this, function (data) {
                this._manualRefreshDataObj = data;
            });
            // to store data needed for filter refresh like scroll position, field order etc...
            this._dataViewerWidget.updateFilterRefreshData = lang.hitch(this, function (data) {
                this._isFilterRefreshClicked = true;
                this._filterRefreshDataObj = data;
            });
            // to enable selection option icon
            this._dataViewerWidget.enableSelectionOptionsIcon = lang.hitch(this, function () {
                this._applicationHeader.enableSelectionOptionsIcon();
            });
            // to disable selection option icon
            this._dataViewerWidget.disableSelectionOptionsIcon = lang.hitch(this, function () {
                this._applicationHeader.disableSelectionOptionsIcon();
            });
            // to show all the records
            this._dataViewerWidget.showAllClicked = lang.hitch(this, function () {
                this._showAllRecords();
            });
            // to show all the records
            this._dataViewerWidget.showSelectedClicked = lang.hitch(this, function () {
                if (this._timeSliderWidget) {
                    this._timeSliderWidget.handleTimeSliderVisibility(2);
                }
                this._detailsPanelWidget.showSelectedClicked();
            });
        },

        /**
         * This function is used to show all the records
         * @memberOf widgets/main/main
         */
        _showAllRecords: function () {
            this._dataViewerWidget.isShowSelectedClicked = false;
            this._dataViewerWidget.isShowAllClicked = true;
            if (this._timeSliderWidget) {
                this._timeSliderWidget.handleTimeSliderVisibility(0);
            }
            this._applicationHeader.enableSearchIcon();
            this._detailsPanelWidget.showAllClicked();
            this._dataViewerWidget.createDataViewerUI(false);
        },

        /**
         * This function is used to destroy data-viewer widget.
         * @memberOf widgets/main/main
         */
        _destroyDataViewerWidget: function () {
            var dataViewerGraphicsLayer;
            if (this.map) {
                dataViewerGraphicsLayer = this.map.getLayer("selectedRowGraphicsLayer");
            }
            if (dom.byId("filterContainerWrapper")) {
                domConstruct.empty(dom.byId("filterContainerWrapper"));
            }
            if (dom.byId("dataViewerWrapperContainer")) {
                domConstruct.empty(dom.byId("dataViewerWrapperContainer"));
            }
            if (dataViewerGraphicsLayer) {
                this.map.removeLayer(dataViewerGraphicsLayer);
            }
            if (this._dataViewerWidget) {
                this._dataViewerWidget.destroy();
            }
        },

        /**
         * This function is used to reorder all the layers on map
         * @memberOf widgets/main/main
         */
        _reorderAllLayers: function () {
            var layer, i, layerInstance, index, basemapLength;
            basemapLength = 1;
            if ((this.map.layerIds) && (this.map.layerIds.length > 0)) {
                basemapLength = this.map.layerIds.length;
            }
            for (i = 0; i < this._itemInfo.itemData.operationalLayers.length; i++) {
                for (layer in this.map._layers) {
                    if (this.map._layers.hasOwnProperty(layer)) {
                        if (this.map._layers[layer].id === this._itemInfo.itemData.operationalLayers[i].id) {
                            layerInstance = this.map.getLayer(this._itemInfo.itemData.operationalLayers[i].id);
                            index = i + basemapLength;
                            this.map.reorderLayer(layerInstance, index);
                        }
                    }
                }
            }
        },

        /**
         * This function is used to pull label layer on top
         * @memberOf widgets/main/main
         */
        _getLayerLayerOnTop: function () {
            var labelLayerObj, numberOfLayers;
            labelLayerObj = this.map.getLayer("labels");
            numberOfLayers = 1000;
            if ((typeof (Object.keys) === "function") && (this.map._layers)) {
                numberOfLayers = Object.keys(this.map._layers).length + 1;
            }
            if (labelLayerObj) {
                this.map.reorderLayer(labelLayerObj, numberOfLayers);
            }
        },

        /**
         * This function is used to add feature layer in label layer
         * @memberOf widgets/main/main
         */
        _addFeatureLayerInLabelLayer: function () {
            var labelLayerObj;
            labelLayerObj = this.map.getLayer("labels");
            if (labelLayerObj && labelLayerObj.hasOwnProperty("featureLayers")) {
                if (this._refinedOperationalLayer.hasOwnProperty("labelingInfo")) {
                    labelLayerObj.featureLayers.push(this._refinedOperationalLayer);
                    labelLayerObj.refresh();
                }
            }
        },

        /**
         * This function is used to remove feature layer in label layer
         * @memberOf widgets/main/main
         */
        _removeLayerFromLabelLayer: function (layerID) {
            var labelLayerObj, i;
            labelLayerObj = this.map.getLayer("labels");
            if (labelLayerObj && labelLayerObj.hasOwnProperty("featureLayers")) {
                for (i = 0; i < labelLayerObj.featureLayers.length; i++) {
                    if (layerID === labelLayerObj.featureLayers[i].id) {
                        labelLayerObj.featureLayers.splice(i, 1);
                        break;
                    }
                }
            }
        },

        /**
         * This function is used to create event handles
         * @param{object} operational layer to which event needs to be attached
         * @memberOf widgets/main/main
         */
        _createFeatureLayerHandle: function () {
            if (this._refinedOperationalLayer) {
                this._dataViewerFeatureLayerUpdateEndHandle = on(this._refinedOperationalLayer, "update-end", lang.hitch(this, function () {
                    if (this._isShowSelectedClicked) {
                        this._isShowSelectedClicked = false;
                        this._dataViewerWidget.createDataViewerUI(false);
                    } else {
                        if (this._reorderLayers) {
                            this._reorderLayers = false;
                            this._reorderAllLayers();
                        }
                        this._removeLayerFromLabelLayer(this._refinedOperationalLayer.id);
                        this._addFeatureLayerInLabelLayer();
                        this._getLayerLayerOnTop();
                        this._refinedOperationalLayer.clearSelection();
                        this._toggleNoFeatureFoundDiv(true);
                        //Enable time slider if it was disable
                        if (this._timeSliderWidget) {
                            this._timeSliderWidget.handleTimeSliderVisibility(0);
                        }
                        //Enable search if it was disable
                        if (this._applicationHeader) {
                            this._applicationHeader._handleSearchIconVisibility(0);
                        }
                        //Check if time slider widget exist, if yes then query and fetch features within current time extent
                        if (this._timeSliderWidget) {
                            var timeExtent, timeQuery;
                            timeExtent = this._timeSliderWidget._createTimeExtent(this._timeSliderWidget.currentTimeInfo);
                            timeQuery = new EsriQuery();
                            timeQuery.timeExtent = timeExtent;
                            timeQuery.where = "1=1";
                            this._refinedOperationalLayer.queryFeatures(timeQuery, lang.hitch(this, function (featureSet) {
                                //Change graphics of layer with latest fetched features
                                this._refinedOperationalLayer.graphics = featureSet.features || [];
                                this._setFeatureLayerCountLabel(this._refinedOperationalLayer.graphics);
                                this._createDataViewer();
                            }));
                        } else {
                            this._setFeatureLayerCountLabel(this._refinedOperationalLayer.graphics);
                            this._createDataViewer();
                        }
                    }
                }));
            }
        },


        /**
        * Instantiate geo-form widget
        * @memberOf main
        */
        _createGeoForm: function () {
            //if geo-from is not visible then
            var geoFormConfigData, layerDefinition;
            layerDefinition = this._layerSelectionDetails.operationalLayerDetails.layerDefinition;
            // parameters that are passed to data-viewer widget
            geoFormConfigData = {
                "config": this.appConfig,
                "webMapID": this._layerSelectionDetails.webMapId,
                "layerId": this._layerSelectionDetails.operationalLayerId,
                "layerTitle": this._layerSelectionDetails.operationalLayerDetails.title,
                "basemapId": this._layerSelectionDetails.itemInfo.itemData.baseMap.baseMapLayers[0].id,
                "changedExtent": this.changedExtent,
                "appUtils": ApplicationUtils,
                "appConfig": this.appConfig
            };

            if (domClass.contains(dom.byId('geoformContainer'), "esriCTHidden")) {
                if (this._layerSelectionDetails && this._layerSelectionDetails.operationalLayerId) {
                    //Show GeoForm
                    domClass.replace(dom.byId('geoformContainer'), "esriCTVisible", "esriCTHidden");
                    //if last shown geoform is for same the layer then don't do anything.
                    if (this.geoformInstance && this._layerSelectionDetails.operationalLayerId === this.geoformInstance.layerId) {
                        if (this.changedExtent) {
                            this.geoformInstance.map.setExtent(this.changedExtent);
                            this.geoformInstance._resizeMap();
                        }
                        this.geoformInstance._activateDrawTool();
                        return;
                    }
                    //if last geoform instance exist then destroy it.
                    this._destroyGeoForm();
                    //Create new instance of geoForm

                    this.geoformInstance = new GeoForm(geoFormConfigData, domConstruct.create("div", {}, dom.byId("geoformContainer")));


                    this.featureGraphicLayer = new GraphicsLayer({ "id": "featureLayerGraphics" });
                    this.map.addLayer(this.featureGraphicLayer);

                    //on submitting issues in geoform update issue wall and main map to show newly updated issue.
                    this.geoformInstance.geoformSubmitted = lang.hitch(this, function (objectId) {
                        try {
                            //refresh main map so that newly created issue will be shown on it.
                            var layer = this._layerSelectionDetails.map.getLayer(this._layerSelectionDetails.operationalLayerId);
                            layer.refresh();
                            if (this.appConfig.showNonEditableLayers) {
                                //Refresh label layers to fetch label of updated feature
                                this.appUtils.refreshLabelLayers(this._layerSelectionDetails.itemInfo.itemData.operationalLayers);
                            }
                            this._addNewFeature(objectId, this.selectedLayer, "geoform").then(lang.hitch(this, function () {
                                //update my issue list when new issue is added
                                if (this._myIssuesWidget) {
                                    this._myIssuesWidget.updateIssueList(this._layerSelectionDetails, null, true);
                                }
                            }));
                            //clear graphics drawn on layer after feature has been submmited
                            this.featureGraphicLayer.clear();
                        } catch (ex) {
                            this.appUtils.showError(ex.message);
                        }
                    });
                    //deactivate the draw tool on main map after closing geoform
                    this.geoformInstance.onFormClose = lang.hitch(this, function () {
                        this.toolbar.deactivate();
                        if (this.featureGraphicLayer) {
                            this.featureGraphicLayer.clear();
                        }
                    });

                    //clear any graphics present on main map after graphic has been drawn on geoform map
                    this.geoformInstance.onDrawComplete = lang.hitch(this, function (evt) {
                        if (this.featureGraphicLayer) {
                            this.featureGraphicLayer.clear();
                        }
                        this._addToGraphicsLayer(evt);
                    });
                    this.geoformInstance.startup();
                }
            }
        },

        /**
        * Add new feature to graphics layer
        * @param{string} objectId
        * @param{object} new feature
        * @param{object} operational layer
        * @memberOf main
        */
        _addNewFeature: function (objectId, layer, addedFrom) {
            var queryFeature, featureDef = new Deferred(), currentDateTime = new Date().getTime();
            queryFeature = new Query();
            queryFeature.objectIds = [parseInt(objectId, 10)];
            queryFeature.outFields = ["*"];
            queryFeature.where = currentDateTime + "=" + currentDateTime;
            queryFeature.returnGeometry = true;
            layer.queryFeatures(queryFeature, lang.hitch(this, function (result) {
                this._createFeature(result.features[0], layer, addedFrom);
                featureDef.resolve();
            }), function (error) {
                featureDef.reject();
                console.log("Error :" + error);
            });
            return featureDef.promise;
        },

        /**
        * Create feature
        * @param{object} new feature
        * @memberOf main
        */
        _createFeature: function (newFeature, layer, addedFrom) {
            var newGraphic, featureExsist = false;
            //Add infotemplate to newly created feature
            newFeature.setInfoTemplate(layer.infoTemplate);
            newGraphic = this._createFeatureAttributes(newFeature, layer);
            //check if newfeature is already present in graphics layer and set featureExsist flag to true
            array.some(this.displaygraphicsLayer.graphics, lang.hitch(this, function (currentFeature) {
                if (currentFeature.attributes[layer.objectIdField] === newGraphic.graphic.attributes[layer.objectIdField]) {
                    featureExsist = true;
                    return true;
                }
            }));
            //If feature is found through search widget, we need to set my issues flag to false if it is true
            if (addedFrom === "search") {
                this._isMyIssues = false;
            }
            if (!featureExsist) {
                //If feature is added through geoform which is outside the buffer, append it to layer graphics array
                this.newlyAddedFeatures.push(newFeature.attributes[layer.objectIdField]);
                this.layerGraphicsArray.push(this._createFeatureAttributes(newFeature, layer));
                this.layerGraphicsArray.sort(this._sortFeatureArray);
                if (this.appConfig.geolocation) {
                    this.layerGraphicsArray.reverse();
                }
                this.displaygraphicsLayer.add(newGraphic.graphic);
                //create or update issue-list
                if (addedFrom === "geoform") {
                    //Increment layer count by 1 since we have successfully added a graphic
                    this.featureLayerCount++;
                }
                this._createIssueWall(this._layerSelectionDetails);
            }
            //If feature is found through search widget then we need to display item details for the selected feature
            if (addedFrom === "search") {
                this._itemSelected(newGraphic.graphic, true);
                this._isMyIssues = false;
            }

            //Since we added one feature now, we need to clear the no features found message
            if (this.displaygraphicsLayer.graphics && this.displaygraphicsLayer.graphics.length > 0) {
                if (!domClass.contains(this._issueWallWidget.noIssuesMessage, "esriCTHidden")) {
                    domClass.add(this._issueWallWidget.noIssuesMessage, "esriCTHidden");
                }
            }
        },

        /**s
        * Create feature object
        * @param{object} New feature
        * @param{object} Distance of feature from current location
        * @param{object} Selected operational layer
        * @memberOf main
        */
        _createFeatureAttributes: function (newFeature, layer) {
            var newGraphic1, fieldValue;
            newGraphic1 = new Graphic();
            //Kepping instance of original feature for further use
            newGraphic1.originalFeature = newFeature;
            newGraphic1.attributes = newFeature.attributes;
            newGraphic1.geometry = newFeature.geometry;
            newGraphic1.infoTemplate = layer.infoTemplate;
            newGraphic1.webMapId = this._layerSelectionDetails.webMapId;
            if (this.appConfig.geolocation) {
                fieldValue = this._getDistanceFromCurrentLocation(newGraphic1);
            } else {
                fieldValue = newGraphic1.attributes[layer.objectIdField];
            }
            return {
                "graphic": newGraphic1,
                "sortValue": fieldValue
            };
        },

        /**
        * Destroy geo-form widget
        * @memberOf main
        */
        _destroyGeoForm: function () {
            //if last geoform instance exist then destroy it.
            if (this.geoformInstance) {
                this.geoformInstance.destroyInstance();
                domConstruct.empty(dom.byId("geoformContainer"));
                this.geoformInstance = null;
            }
        },

        /**
        * Add graphic on the map
        * @param{object} evt, draw tool bar event
        * @memberOf widgets/geo-form/geo-form
        */
        _addToGraphicsLayer: function (evt) {
            var symbol, graphic, graphicGeometry;
            // clear graphics on the map
            this._clearSubmissionGraphic();
            // get geometry
            if (evt.geometry) {
                graphicGeometry = evt.geometry.type === "extent" ? this._createPolygonFromExtent(evt.geometry) : evt.geometry;
            } else {
                graphicGeometry = evt;
            }
            symbol = this._createFeatureSymbol(graphicGeometry.type);
            // create new graphic
            graphic = new Graphic(graphicGeometry, symbol);
            // add graphics
            this.featureGraphicLayer.add(graphic);
        },

        /**
        * Clear graphics
        * @memberOf widgets/geo-form/geo-form
        */
        _clearSubmissionGraphic: function () {
            if (this.featureGraphicLayer) {
                this.featureGraphicLayer.clear();
            }
        },

        /**
        * Convert extent type of geometry to polygon geometry
        * @param{object} geometry, geometry of the graphics plotted on the map
        * @memberOf widgets/geo-form/geo-form
        */
        _createPolygonFromExtent: function (geometry) {
            var polygon = new Polygon(geometry.spatialReference);
            // set geometry ring to the polygon layer
            polygon.addRing([
                [geometry.xmin, geometry.ymin],
                [geometry.xmin, geometry.ymax],
                [geometry.xmax, geometry.ymax],
                [geometry.xmax, geometry.ymin],
                [geometry.xmin, geometry.ymin]
            ]);
            // return polygon geometry
            return polygon;
        },

        /**
        * Create symbol for draw tool geometries in draw tab
        * @param{string} geometryType, type of geometry
        * @memberOf widgets/geo-form/geo-form
        */
        _createFeatureSymbol: function (geometryType) {
            var symbol;
            //set symbol for selected geometry type of the layer
            switch (geometryType) {
            case "point":
                symbol = new SimpleMarkerSymbol();
                break;
            case "polyline":
                symbol = new SimpleLineSymbol();
                break;
            case "polygon":
                symbol = new SimpleFillSymbol();
                break;
            }
            //return symbol
            return symbol;
        },

        /**
         * This function is used to instantiate time slider widget.
         * @memberOf widgets/main/main
         */
        _createTimeSlider: function () {
            this._destroyTimeSliderWidget();
            var timeSliderParameters;
            timeSliderParameters = {
                "appConfig": this.appConfig,
                "appUtils": ApplicationUtils,
                "webmapJSON": this._layerSelectionDetails.itemInfo,
                "map": this.map,
                "selectedLayer": this._refinedOperationalLayer,
                "timeInfo": this._timeInfo
            };
            this._timeSliderWidget = new TimeSlider(timeSliderParameters, domConstruct.create("div", {}, dom.byId('timeSliderWrapperContainer')));

            // handler for the hiding web map list on time slider buttons click
            this._timeSliderWidget.hideWebMapList = lang.hitch(this, function () {
                if ((!domClass.contains("webmapListToggleButton", "esriCTWebMapPanelToggleButtonOpenDisabled")) && (!domClass.contains("webmapListToggleButton", "esriCTWebMapPanelToggleButtonCloseDisabled"))) {
                    this._webMapListWidget.hideWebMapList();
                }
            });

            this._timeSliderWidget.startup();
            if (this._disableTimeSliderClickHandle) {
                this._disableTimeSliderClickHandle.remove();
            }
            // Show alert message when user try to interact with the time slider in edit mode
            this._disableTimeSliderClickHandle = on(dom.byId("disableTimeSliderWrapperContainer"), "click", lang.hitch(this, function () {
                ApplicationUtils.showMessage(this.appConfig.i18n.timeSlider.timeSliderInEditModeAlert);
            }));

        },

        /**
         * This function is used to destroy time slider widget.
         * @memberOf widgets/main/main
         */
        _destroyTimeSliderWidget: function () {
            if (this._timeSliderWidget) {
                this._timeSliderWidget.destroy();
                this._timeSliderWidget = null;
            }
        },

        /**
         * This function is used to resize the map when its container is resized.
         * @memberOf widgets/main/main
         */
        _resizeMap: function () {
            var mapCenter;
            if ((this.map) && (domStyle.get(dom.byId("mapDiv"), "display") === "block")) {
                domStyle.set(dom.byId("mapDiv"), "height", "100%");
                domStyle.set(dom.byId("mapDiv"), "width", "100%");
            }
            setTimeout(lang.hitch(this, function () {
                if ((this.map) && (domStyle.get(dom.byId("mapDiv"), "display") === "block")) {
                    mapCenter = this.map.extent.getCenter();
                    this.map.resize();
                    this.map.reposition();
                    this.map.centerAt(mapCenter);
                }
            }), 500);
        },

        /**
         * This function is used to instantiate details panel widget.
         * @memberOf widgets/main/main
         */
        _createDetailsPanel: function (showDetailsPanelDataObj) {
            this._destroyDetailsPanelWidget();
            var detailsPanelParameters;
            detailsPanelParameters = {
                "appConfig": this.appConfig,
                "selectedFeatureSet": showDetailsPanelDataObj.singleFeature,
                "selectedOperationalLayer": this._refinedOperationalLayer,
                "map": this.map,
                "appUtils": ApplicationUtils,
                "itemInfo": this._itemInfo,
                "popupInfo": this._layerSelectionDetails.operationalLayerDetails.popupInfo,
                "multipleFeatures": showDetailsPanelDataObj.multipleFeature,
                "isShowSelectedClicked": this._dataViewerWidget.isShowSelectedClicked,
                "isShowAllClicked": this._dataViewerWidget.isShowAllClicked
            };
            this._detailsPanelWidget = new DetailsPanel(detailsPanelParameters, domConstruct.create("div", {}, dom.byId("detailsPanelWrapperContainer")));
            this._attachDetailsPanelEventListener();
            this._detailsPanelWidget.startup();
        },



        /**
         * This function is used to attach event listener to details panel widget
         * @memberOf widgets/main/main
         */
        _attachDetailsPanelEventListener: function () {
            this._detailsPanelWidget.hideWebMapList = lang.hitch(this, function () {
                if ((!domClass.contains("webmapListToggleButton", "esriCTWebMapPanelToggleButtonOpenDisabled")) && (!domClass.contains("webmapListToggleButton", "esriCTWebMapPanelToggleButtonCloseDisabled"))) {
                    this._webMapListWidget.hideWebMapList();
                }
            });

            this._detailsPanelWidget.onFeatureUpdated = lang.hitch(this, function (updatedfeature, isShowSelectedClicked) {
                this.updatedFeature = updatedfeature;
                // Refresh selected layer to get updated features
                this._isShowSelectedClicked = isShowSelectedClicked;
                this._refinedOperationalLayer.refresh();
            });

            this._detailsPanelWidget.onMultipleFeatureEditCancel = lang.hitch(this, function (feature) {
                //highlight selected features row in table
                this._dataViewerWidget.highlightSelectedFeature(feature);
            });

            this._detailsPanelWidget.popupEditModeEnabled = lang.hitch(this, function (isEditMode) {
                var featureLength;
                if (isEditMode) {
                    featureLength = 2;
                    if (this._dataViewerWidget) {
                        this._dataViewerWidget.isEditMode = true;
                    }
                } else {
                    featureLength = 1;
                    if (this._dataViewerWidget) {
                        this._dataViewerWidget.isEditMode = false;
                    }
                }
                if (((this._timeSliderWidget) && (!this._dataViewerWidget)) || ((this._timeSliderWidget) && (this._dataViewerWidget) && (!this._dataViewerWidget.isShowSelectedClicked))) {
                    this._timeSliderWidget.handleTimeSliderVisibility(featureLength);
                }
                // If search widget exist, handle its visibility
                if (((this._applicationHeader) && (!this._dataViewerWidget)) || ((this._applicationHeader) && (this._dataViewerWidget) && (!this._dataViewerWidget.isShowSelectedClicked))) {
                    this._applicationHeader._handleSearchIconVisibility(featureLength);
                }
            });
        },

        /**
         * This function is used to destroy details panel widget.
         * @memberOf widgets/main/main
         */
        _destroyDetailsPanelWidget: function () {
            if (this._detailsPanelWidget) {
                this._detailsPanelWidget.destroyPopupWidget();
                this._detailsPanelWidget.destroyMediaWidget();
                this._detailsPanelWidget.destroyCommentsWidget();
                this._detailsPanelWidget.destroyInspectionsWidget();
                this._detailsPanelWidget.destroyOmsetningWidget();
                this._detailsPanelWidget.destroy();
            }
            if (dom.byId("detailsPanelWrapperContainer")) {
                domClass.add(dom.byId("detailsPanelWrapperContainer"), "esriCTHideTabList");
            }
        },

        /**
         * This function is used to resize upper and lower container using resize handler
         * @memberOf widgets/main/main
         */
        _resizeUpperAndLowerContainer: function () {
            //set jquery resizable on upper container
            $("#upperContainer").resizable({
                alsoResizeReverse: "#lowerContainer", //on resizing upper container resize the lower map container
                handles: 's', //show resize handel only at the bottom of the grid container
                containment: "#UpperAndLowerWrapperContainer",
                maxHeight: 550,
                minHeight: 140
            });

            //handle resize stop event which will be fired on resize complete
            //after completing resize of containers, resize the map so that it will be fit resized size
            $("#upperContainer").on("resizestop", lang.hitch(this, function () {
                ApplicationUtils.showLoadingIndicator();
                $(".esriCTFilterParentContainer").css("display", "none");
                var mainContainerHeight, upperContainerHeight, lowerContainerHeight;
                mainContainerHeight = parseFloat(domStyle.get("UpperAndLowerWrapperContainer", "height"));
                upperContainerHeight = parseFloat(domStyle.get("upperContainer", "height"));
                lowerContainerHeight = mainContainerHeight - upperContainerHeight;
                domStyle.set("lowerContainer", "height", lowerContainerHeight + "px");
                // add for resize image container LB
                if (query(".tab-content")[0]) {
                    if (dom.byId("carouselInnerContainer")) {
                        domStyle.set("carouselInnerContainer", "height", (query(".tab-content")[0].clientHeight - 18) + "px");
                    }
                }
                this._resizeMap();
                if (query(".esriCTDataViewerMainContainer") && (query(".esriCTDataViewerMainContainer").length > 0) && query(".esriCTDataViewerMainContainer")[0].clientHeight) {
                    domStyle.set(this._dataViewerWidget.dataViewerContainer, "height", query(".esriCTDataViewerMainContainer")[0].clientHeight + "px");
                }
                // fit charts in media panel
                if (this._detailsPanelWidget) {
                    this._detailsPanelWidget.resizeChart();
                }
                ApplicationUtils.hideLoadingIndicator();
            }));
        },

        /**
         * This function is used to remove event handles
         * @memberOf widgets/main/main
         */
        _removeFeatureLayerHandle: function () {
            // removes previous feature layer update end handle
            if (this._dataViewerFeatureLayerUpdateEndHandle) {
                this._dataViewerFeatureLayerUpdateEndHandle.remove();
            }
        },

        /**
         * This function is used to show appropriate message when details panel is empty
         * @memberOf widgets/main/main
         */
        _handleEmptyDetailsPanel: function () {
            var noContentWrapperContainer;
            if (dojo.query(".esriCTNoContentDetailsPanelWrapperContainer")[0]) {
                domConstruct.destroy(dojo.query(".esriCTNoContentDetailsPanelWrapperContainer")[0]);
            }
            noContentWrapperContainer = domConstruct.create("div", { "class": "esriCTNoContentDetailsPanelWrapperContainer" }, dom.byId("detailsPanelWrapperContainer"));
            domConstruct.create("div", { "class": "esriCTNoContentDetailsPanelContainer esriCTBodyTextColor", "innerHTML": this.appConfig.i18n.detailsPanel.selectFeatureMessage }, noContentWrapperContainer);
        },

        /**
         * This function is used to show appropriate message when Data viewer panel is empty
         * @memberOf widgets/main/main
         */
        _handleEmptyDataViewerPanel: function () {
          var noDataWrapperContainer, webMapListContainer, webMapListContainerWidth;
          webMapListContainer = dom.byId('webMapListContainer');
          webMapListContainerWidth = $(webMapListContainer).outerWidth(true);
          domConstruct.empty(dom.byId("overlayContainer"));
          noDataWrapperContainer = domConstruct.create("div", {
              "class": "esriCTNoDataDataViewerPanelContainer",
              "innerHTML": this.appConfig.i18n.dataviewer.selectLayerToBegin
          }, dom.byId("overlayContainer"));
          if (this.appConfig.i18n.direction === "rtl") {
              domStyle.set(noDataWrapperContainer, "padding-right", webMapListContainerWidth + "px");
          } else {
              domStyle.set(noDataWrapperContainer, "padding-left", webMapListContainerWidth + "px");
          }
          this._setNoDataDataViewerMessagePosition();
        },

        /**
         * This function is align the no data message when Data viewer panel is empty from the top
         * @memberOf widgets/main/main
         */
        _setNoDataDataViewerMessagePosition: function () {
            var noDataViewerContainer, upperContainerHeight;
            upperContainerHeight = parseFloat(domStyle.get("upperContainer", "height") / 2);
            noDataViewerContainer = query(".esriCTNoDataDataViewerPanelContainer")[0];
            if (noDataViewerContainer) {
                domStyle.set(noDataViewerContainer, "marginTop", upperContainerHeight + "px");
            }
        },

        /**
         * This function is used to screen of error message
         * @memberOf widgets/main/main
         */
        _displayErrorMessageScreen: function (error) {
            var errorMessage, signInErrorMessageContainerHeight;
            domClass.add("UpperAndLowerWrapperContainer", "esriCTHidden");
            domClass.remove("signInErrorMessageContainer", "esriCTHidden");
            errorMessage = this.appConfig.i18n.map.error;
            if (error && error.message) {
                errorMessage = error.message;
            }
            signInErrorMessageContainerHeight = $("#signInErrorMessageContainer").outerHeight(true);
            signInErrorMessageContainerHeight = parseFloat(signInErrorMessageContainerHeight);
            domStyle.set("signInErrorMessageContainer", "line-height", signInErrorMessageContainerHeight + "px");
            domClass.add("signInErrorMessageContainer", "esriCTTextAlignCenter");
            domAttr.set("signInErrorMessageContainer", "innerHTML", errorMessage);
            ApplicationUtils.hideLoadingIndicator();
        },

        /**
         * This function is used to show/hide state of empty details panel
         * @memberOf widgets/main/main
         */
        _toggleNoFeatureFoundDiv: function (isVisible) {
            //Show/hide initial load message
            if (query(".esriCTNoContentDetailsPanelWrapperContainer")[0]) {
                if (isVisible) {
                    domClass.remove(query(".esriCTNoContentDetailsPanelWrapperContainer")[0], "esriCTHidden");
                } else {
                    domClass.add(query(".esriCTNoContentDetailsPanelWrapperContainer")[0], "esriCTHidden");
                }
            }
        },

        /**
         * This function is used to extract statice definition expression of layer
         * @memberOf widgets/main/main
         */
        _extractStaticExpression: function (opLayerInfo) {
            var arrayList = [], parameterizedExpression, expressionArray = [], expressionValue, andExpression = false, newExpression = "";
            parameterizedExpression = opLayerInfo.definitionEditor.parameterizedExpression;
            // split and check if multiple filters are applied
            if (parameterizedExpression.split(") AND (").length > 1) {
                // if the expression is an 'ALL' expression
                andExpression = true;
                // if 'yes' then slice substring to set values accordingly
                expressionValue = parameterizedExpression.substring(1, (parameterizedExpression.length - 1));
                // split the parameterizedExpression to set values to set current definition expression
                arrayList = expressionValue.split(") AND (");
            } else if (parameterizedExpression.split(") OR (").length > 1) {
                // if the expression is an 'ANY' expression
                andExpression = false;
                // if 'yes' then slice substring to set values accordingly
                expressionValue = parameterizedExpression.substring(1, (parameterizedExpression.length - 1));
                // split the parameterizedExpression to set values to set current definition expression
                arrayList = expressionValue.split(") OR (");
            } else {
                // if it is a single parameter expression
                arrayList[0] = parameterizedExpression;
            }
            array.forEach(arrayList, lang.hitch(this, function (arrayElement) {
                // for dynamic filtering option
                if (arrayElement.split("{").length <= 1) {
                    // for static filter
                    expressionArray.push(arrayElement);
                }
            }));
            //Create definition expression
            array.forEach(expressionArray, lang.hitch(this, function (currentExpression, index) {
                if (andExpression) {
                    newExpression += "(" + currentExpression + ")";
                    if (index !== expressionArray.length - 1) {
                        newExpression += " AND ";
                    }
                } else {
                    newExpression += "(" + currentExpression + ")";
                    if (index !== expressionArray.length - 1) {
                        newExpression += " OR ";
                    }
                }
            }));
            return newExpression;
        },

        /**
         * Check for user account and his privileges to show/hide editing buttons
         * @memberOf widgets/main/main
         */
        _checkUserPrivileges: function () {
            var userActLevel;
            if (this._loggedInUser && this._loggedInUser.hasOwnProperty("level") && this._loggedInUser.hasOwnProperty("privileges")) {
                userActLevel = parseInt(this._loggedInUser.level, 10);
                if (userActLevel > 1 && this._loggedInUser.privileges.indexOf("features:user:edit") >= 0) {
                    return true;
                }
            }
            return false;
        }
    });
});
