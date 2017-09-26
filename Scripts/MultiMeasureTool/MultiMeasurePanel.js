AutodeskNamespace('Autodesk.Viewing.Extensions.MultiMeasureTool');


(function() {

"use strict";

    var avem = AutodeskNamespace('Autodesk.Viewing.Extensions.MultiMeasureTool'),
    av = Autodesk.Viewing,
    ave = Autodesk.Viewing.Extensions,
    avp = Autodesk.Viewing.Private,
    avu = Autodesk.Viewing.UI;

//
// /** @constructor */
//
//
var MeasurePanel = function(measureTool, viewer, id, title, options)
{
    avu.DockingPanel.call(this, viewer.container, id, title, options);

    this.kPanelExpandedHeight  = 310; // px
    this.kPanelCollapsedHeight =  35; //px

    this.isDeltaExpanded = true;
    this.isSettingsExpanded = false;
    this.isolateMeasure = false;

    this.measureTool = measureTool;
    this.viewer = viewer;
    this.parentContainer = viewer.container;

    this.container.classList.add('measurePanel');
    this.container.dockRight = true;

    this.container.style.minWidth  = "300px";
    this.container.style.width = "300px";
    this.container.style.minHeight = this.kPanelCollapsedHeight + "px";
    this.container.style.height    = this.kPanelExpandedHeight + "px";
    this.container.style.maxHeight = this.kPanelExpandedHeight + "px";
    this.container.style.top       = "200px";
    this.container.style.left      = "220px"; // just needs an initial value dock overrides value
    //this.container.style.resize    = "none";
    this.container.style.position  = "absolute";

    this.addEventListener( this.closer, "click", function(e) {
        // WHen the close button is clicked, deactivate the tool as well.
        if (options && options.onCloseCallback)
            options.onCloseCallback();
    });

    // Add arrow to the title and add expand/collapse behavior..
    var titleElement = this.container.children[0];
    //titleElement.classList.add( "measure-panelTitle" );
    titleElement.classList.add( "expanded" );

    options = options || {};
    if (!options.heightAdjustment)
        options.heightAdjustment = 40;
    if (!options.marginTop)
        options.marginTop = 0;
    options.left = false;
    this.createScrollContainer(options);

    this.measureResults = document.createElement("div");
    this.scrollContainer.appendChild( this.measureResults );
    //this.container.style.overflow = "auto";

    var self = this;


    // Add selection 1 section

    this.selection1 = document.createElement("div");    // Container for selection one
    this.selection1.className = "measure-result-container";
    this.measureResults.appendChild(this.selection1);

    var selection1Label = document.createElement('div');    // Icon for selection one
    selection1Label.className = 'measure-selectionOne-label';
    this.selection1.appendChild(selection1Label);

    var selection1Label_icon = document.createElement('div');
    selection1Label_icon.className = 'adsk-icon-first measure-label-icon';
    selection1Label.appendChild(selection1Label_icon);

    this.selection1Result = document.createElement("div");    // Selection result
    this.selection1Result.className = "measure-selection-result";
    this.selection1.appendChild(this.selection1Result);

    var selection1Repick = document.createElement("div");    // Icon for repick button
    selection1Repick.className = 'adsk-icon-refresh measure-repick';
    selection1Repick.addEventListener('click', function (event) {
        self.firstSelectionRepick();
    }, true);
    this.selection1.appendChild(selection1Repick);

    this.addDivider( this.selection1 );


    // Add the result section.
    this.results = document.createElement("div");    // Container for measure result (distance or angle)
    this.results.className = "measure-result-container";
    this.measureResults.appendChild(this.results);

    this.distIcon = document.createElement("div");    // Icon for distance measurement
    this.distIcon.className = 'adsk-icon-measure-distance measure-distance-icon';
    this.results.appendChild(this.distIcon);

    this.angleIcon = document.createElement("div");    // Icon for angle measurement
    this.angleIcon.className = 'adsk-icon-measure-angle measure-angle-icon';
    this.results.appendChild(this.angleIcon);

    this.distanceDiv = document.createElement("div");    // Distance measurement result
    this.distanceDiv.className = 'measure-result';
    this.results.appendChild( this.distanceDiv );

    this.angleDiv = document.createElement("div");    // Angle measurement result
    this.angleDiv.className = 'measure-result';
    this.results.appendChild(this.angleDiv);

    this.initialDiv = document.createElement("div");    // Initial result "0"
    this.initialDiv.className = "measure-initial";
    this.initialDiv.textContent = "0.00";
    this.results.appendChild( this.initialDiv );

    this.settingsButton = document.createElement("div");    // Icon for settings button
    this.settingsButton.className = 'adsk-icon-settings measure-settings-button';
    this.settingsButton.addEventListener('click', function (event) {
        self.showMeasureSettings();
    }, true);
    this.results.appendChild(this.settingsButton);

    this.deltaButton = document.createElement("div");    // Icon for delta button
    this.deltaButton.className = 'adsk-icon-arrow measure-delta-button';
    this.deltaButton.addEventListener('click', function (event) {
        self.toggle();
    }, true);
    this.results.appendChild(this.deltaButton);

    this.deltaXDiv = document.createElement("div");    // Delta X
    this.deltaXDiv.className = 'measure-delta-result';
    this.results.appendChild( this.deltaXDiv );

    var xSpan1 = document.createElement("span");    // "Delta"
    xSpan1.setAttribute("data-i18n", "Delta");
    xSpan1.textContent = av.i18n.translate("Delta");
    this.deltaXDiv.appendChild( xSpan1 );
    var xSpan2 = document.createElement("span");    // "X"
    xSpan2.className = "measure-label-axis-x";
    xSpan2.textContent = "X";
    this.deltaXDiv.appendChild( xSpan2 );
    var xSpan3 = document.createElement("span");    // the value
    this.deltaXDiv.appendChild( xSpan3 );

    this.deltaYDiv = document.createElement("div");    // Delta Y
    this.deltaYDiv.className = 'measure-delta-result';
    this.results.appendChild( this.deltaYDiv );

    var ySpan1 = document.createElement("span");    // "Delta"
    ySpan1.setAttribute("data-i18n", "Delta");
    ySpan1.textContent = av.i18n.translate("Delta");
    this.deltaYDiv.appendChild( ySpan1 );
    var ySpan2 = document.createElement("span");    // "Y"
    ySpan2.className = "measure-label-axis-y";
    ySpan2.textContent = "Y";
    this.deltaYDiv.appendChild( ySpan2 );
    var ySpan3 = document.createElement("span");    // the value
    this.deltaYDiv.appendChild( ySpan3 );

    this.deltaZDiv = document.createElement("div");    // Delta Z
    this.deltaZDiv.className = 'measure-delta-result';
    this.results.appendChild( this.deltaZDiv );

    var zSpan1 = document.createElement("span");    // "Delta"
    zSpan1.setAttribute("data-i18n", "Delta");
    zSpan1.textContent = av.i18n.translate("Delta");
    this.deltaZDiv.appendChild( zSpan1 );
    var zSpan2 = document.createElement("span");    // "Z"
    zSpan2.className = "measure-label-axis-z";
    zSpan2.textContent = "Z";
    this.deltaZDiv.appendChild( zSpan2 );
    var zSpan3 = document.createElement("span");    // the value
    this.deltaZDiv.appendChild( zSpan3 );

    this.addDivider( this.results );


    // Add selection 2 section

    this.selection2 = document.createElement("div");    // Container for selection two
    this.selection2.className = "measure-result-container";
    this.measureResults.appendChild(this.selection2);

    var selection2Label = document.createElement('div');    // Icon for selection two
    selection2Label.className = 'measure-selectionTwo-label';
    this.selection2.appendChild(selection2Label);

    var selection2Label_icon = document.createElement('div');
    selection2Label_icon.className = 'adsk-icon-second measure-label-icon';
    selection2Label.appendChild(selection2Label_icon);

    this.selection2Result = document.createElement("div");    // Selection result
    this.selection2Result.className = "measure-selection-result";
    this.selection2.appendChild(this.selection2Result);

    var selection2Repick = document.createElement("div");    // Icon for repick button
    selection2Repick.className = 'adsk-icon-refresh measure-repick';
    selection2Repick.addEventListener('click', function (event) {
        self.secondSelectionRepick();
    }, true);
    this.selection2.appendChild(selection2Repick);

    this.addDivider( this.selection2 );


    // Settings
    this.measureSettings = document.createElement("div");
    this.measureSettings.className = "measure-settings";
    this.measureSettings.style.display = "none";
    this.measureResults.appendChild(this.measureSettings);

    this.table = document.createElement("table");
    this.table.className = "tftable measure-table";
    this.tbody = document.createElement("tbody");
    this.table.appendChild(this.tbody);
    this.measureSettings.appendChild(this.table);

    this.units = [
        { name: 'Unknown', units: '', matches: [''] },                                      // localized in OptionDropDown() call below
        { name: 'Decimal feet', units: 'decimal-ft', matches: ['ft', 'decimal-ft'] },             // localized in OptionDropDown() call below
        { name: 'Feet and fractional inches', units: 'ft-and-fractional-in', matches: ['ft-and-fractional-in'] },         // localized in OptionDropDown() call below
        { name: 'Feet and decimal inches', units: 'ft-and-decimal-in', matches: ['ft-and-decimal-in'] }, // localized in OptionDropDown() call below
        { name: 'Decimal inches', units: 'decimal-in', matches: ['in', 'decimal-in'] },           // localized in OptionDropDown() call below
        { name: 'Fractional inches', units: 'fractional-in', matches: ['fractional-in'] },  // localized in OptionDropDown() call below
        { name: 'Meters', units: 'm', matches: ['m'] },                                     // localized in OptionDropDown() call below
        { name: 'Centimeters', units: 'cm', matches: ['cm'] },                              // localized in OptionDropDown() call below
        { name: 'Millimeters', units: 'mm', matches: ['mm'] },                              // localized in OptionDropDown() call below
        { name: 'Meters and centimeters', units: 'm-and-cm', matches: ['m-and-cm'] }        // localized in OptionDropDown() call below
    ];

    var initialIndex = this.findUnits(),
        unitNames = [];
    for (var i = 0; i < this.units.length; ++i) {
        unitNames.push(this.units[i].name);
    }

    this.unitList = new avp.OptionDropDown("Unit type", this.tbody, unitNames, initialIndex);
    this.addEventListener(this.unitList, "change", function(e) {
        var index = self.unitList.selectedIndex;
        var toUnits = self.units[index].units;
        self.measureTool.setUnits(toUnits);
        self.updatePanel();
        self.setupPrecision();
        if (avp.logger) {
            avp.logger.log({ category: 'pref_changed', name: 'measure/units', value: toUnits });
        }
    });

    this.precisionList = new avp.OptionDropDown("Precision", this.tbody, [], -1);
    this.addEventListener(this.precisionList, "change", function(e) {
        var index = self.precisionList.selectedIndex;
        self.measureTool.setPrecision(index);
        self.updatePanel();
        if (avp.logger) {
            avp.logger.log({ category: 'pref_changed', name: 'measure/precision', value: index });
        }
    });
    this.setupPrecision();

    this.isolate = new avp.OptionCheckbox("Isolate measurement", this.tbody, false);
    this.addEventListener(this.isolate, "change", function(e) {
        var enable = self.isolate.checked;
        self.isolateMeasure = enable;
        if (self.isolateMeasure) {
            self.measureTool.isolateMeasurement();
        }
        else {
            self.measureTool.clearIsolate();
        }
        if (avp.logger) {
            avp.logger.log({ category: 'pref_changed', name: 'measure/isolate', value: enable });
        }
    });

    this.addDivider(this.measureSettings);


    // Add restart section
    var restart = document.createElement('div');
    restart.className = 'measure-restart';
    restart.setAttribute("data-i18n", "Restart");
    restart.textContent = av.i18n.translate("Restart");
    restart.addEventListener('click', function () {
        self.measureTool.clearMeasurement();
    }, false);

    this.measureResults.appendChild(restart);
    this.updatePanel();
    this.addVisibilityListener(function () {
        self.resizeToContent({maxHeight: self.parentContainer.offsetHeight - 75});
    });

    this.hideMeasureResult();

}; // end constructor

MeasurePanel.prototype = Object.create(avu.DockingPanel.prototype);
ave.ViewerPanelMixin.call(MeasurePanel.prototype);

MeasurePanel.prototype.addDropDownMenu = function addDropDownMenu(parent, label, optionList, initialIndex, onchange) {

    // Wrap the onchange with the update to that setting
    var handler = function(e) {
        var selectedIndex = e.target.selectedIndex;
        onchange(selectedIndex);
    };

    var selectElem = document.createElement("select");
    selectElem.className = 'optionDropDown';
    for (var i = 0; i < optionList.length; i++) {
        var item = document.createElement("option");
        item.value = i;
        item.setAttribute("data-i18n",  optionList[i]);
        item.textContent = av.i18n.translate( optionList[i] );
        selectElem.add(item);
    }

    var div = document.createElement("div");
    div.className = "measure-submenu-select";

    var lbl = document.createElement("div");
    lbl.className = "measure-submenu-selectlabel";
    lbl.setAttribute ('for', label);
    lbl.setAttribute("data-i18n", label);
    lbl.textContent = av.i18n.translate( label );
    div.appendChild(lbl);
    div.appendChild(selectElem);

    parent.appendChild(div);

    selectElem.selectedIndex = initialIndex;
    selectElem.onchange = handler;

    return selectElem;
};

MeasurePanel.prototype.addDivider = function addDivider(parent) {
    var item = document.createElement("div");
    item.className = "measure-horizontal-divider";
    parent.appendChild(item);
    return item;
};

MeasurePanel.prototype.findUnits = function findUnits() {
    var i,
        j,
        selectedUnits = this.measureTool.getUnits();
    for (i = 0; i < this.units.length; ++i) {
        var matches = this.units[i].matches;
        if (matches) {
            for (j = 0; j < matches.length; ++j) {
                if (matches[j] === selectedUnits) {
                    return i;
                }
            }
        }
    }
    return 0;
};


MeasurePanel.prototype.setupPrecision = function setupPrecision () {
    while (this.precisionList.dropdownElement.lastChild) {
        this.precisionList.dropdownElement.removeChild(this.precisionList.dropdownElement.lastChild);
    }

    var selectedUnits = this.measureTool.getUnits(),
        precisions;

    if (selectedUnits === 'ft-and-fractional-in' || selectedUnits === 'fractional-in') {
        precisions = ['1', '1/2', '1/4', '1/8', '1/16', '1/32', '1/64'];
    } else {
        precisions = ['0', '0.1', '0.01', '0.001', '0.0001', '0.00001'];
    }

    for (var i = 0; i < precisions.length; ++i) {
        var elem = document.createElement('option');
        elem.value = i;
        elem.textContent = precisions[i];
        this.precisionList.dropdownElement.appendChild(elem);
    }

    var selectedIndex = this.measureTool.getPrecision();
    if (precisions.length <= selectedIndex) {
        selectedIndex = precisions.length - 1;
        self.measureTool.setPrecision(selectedIndex);
    }
    this.precisionList.dropdownElement.selectedIndex = selectedIndex;
};


MeasurePanel.prototype.uninitialize = function uninitialize() {
    this.viewer = null;
    avu.DockingPanel.prototype.uninitialize.call(this);
};

MeasurePanel.prototype.onTitleClick = function onTitleClick(event) {
    //this.toggle();
};

MeasurePanel.prototype.deltaCollapse = function deltaCollapse() {

    this.deltaButton.classList.toggle('rotated');

    this.measureTool.getIndicator().setSimple(this.isDeltaExpanded);

    if (this.isDeltaExpanded) {
        this.deltaXDiv.style.display = "none";
        this.deltaYDiv.style.display = "none";
        this.deltaZDiv.style.display = "none";

        this.isDeltaExpanded = false;
    }
    else {
        this.deltaXDiv.style.display = "block";
        this.deltaYDiv.style.display = "block";
        if (this.viewer.model && !this.viewer.model.is2d()) {
            this.deltaZDiv.style.display = "block";
        }

        this.isDeltaExpanded = true;
    }

    this.resizeToContent();
};

/**
 * Toggles the collapse/expand state of the panel.
 */
MeasurePanel.prototype.toggle = function toggle() {
    this.deltaCollapse();
};

/**
 * Returns the collapse or expand state of the panel.
 * @returns {boolean} true if the panel is expanded.
 */
MeasurePanel.prototype.isExpanded = function isExpanded() {
    return this.container.children[0].classList.contains("expanded");
};

/**
 * Returns the width and height to be used when resizing the panel to the content.
 *
 * @returns {{height: number, width: number}}
 */
MeasurePanel.prototype.getContentSize = function getContentSize() {
    return {
        height: this.isExpanded() ? this.measureResults.clientHeight + 46 : 0,
        width: this.measureResults.clientWidth
    };
};

MeasurePanel.prototype.updatePanel = function updatePanel() {
    var that = this;
    function setText(elem, name) {
        if (name === 'angle') {
            elem.textContent = "~ " + that.measureTool.getAngle();
        } else if (name === 'xyz') {
            elem.textContent = "~ " + that.measureTool.getDistance(name);
        } else {
            elem.children[2].textContent = " = ~ " + that.measureTool.getDistance(name);
        }
    }

    setText(this.distanceDiv, 'xyz');
    setText(this.deltaXDiv, 'x');
    setText(this.deltaYDiv, 'y');
    setText(this.deltaZDiv, 'z');
    setText(this.angleDiv, 'angle');

    this.unitList.dropdownElement.selectedIndex = this.findUnits();
    this.precisionList.dropdownElement.selectedIndex = this.measureTool.getPrecision();
    this.initialDiv.textContent = avp.formatValueWithUnits(0, null, 3, this.measureTool.getPrecision());

    this.showSelection1();
    this.showSelection2();

};

MeasurePanel.prototype.showDistanceResult = function showDistanceResult(/*optional*/hideXYZ) {
    this.results.style.display = "block";
    this.initialDiv.style.display = "none";
    this.angleDiv.style.display = "none";
    this.angleIcon.style.display = "none";
    this.distanceDiv.style.display = "inline-block";
    this.distIcon.style.display = "inline-block";

    // Add hideXYZ option because parallel faces should only display distance, not XYZ per Fusion's request
    if (!hideXYZ) {
        this.deltaButton.style.display = "inline-block";
        if (this.isDeltaExpanded) {
            this.deltaXDiv.style.display = "block";
            this.deltaYDiv.style.display = "block";
            if (this.viewer.model && !this.viewer.model.is2d()) {
                this.deltaZDiv.style.display = "block";
            }
        }
    }
    else {
        this.deltaButton.style.display = "none";
        if (this.isDeltaExpanded) {
            this.deltaXDiv.style.display = "none";
            this.deltaYDiv.style.display = "none";
            this.deltaZDiv.style.display = "none";
        }
    }

    this.resizeToContent();
};

MeasurePanel.prototype.showAngleResult = function showAngleResult() {
    this.results.style.display = "block";
    this.initialDiv.style.display = "none";
    this.angleDiv.style.display = "inline-block";
    this.angleIcon.style.display = "inline-block";
    this.distanceDiv.style.display = "none";
    this.distIcon.style.display = "none";
    this.deltaButton.style.display = "none";
    if (this.isDeltaExpanded) {
        this.deltaXDiv.style.display = "none";
        this.deltaYDiv.style.display = "none";
        this.deltaZDiv.style.display = "none";
    }
    this.resizeToContent();
};

MeasurePanel.prototype.showSelection1 = function showSelection1() {
    var result = this.measureTool.getFirstGeometry();

    if (result.type === null) {
        return;
    }

    if (result.type === SNAP_VERTEX) { // Vertex

        this.selection1Result.setAttribute("data-i18n", "Vertex");
        this.selection1Result.textContent = av.i18n.translate("Vertex");
        this.selection1Result.style.display = "inline-block";
    }
    else if (result.type === SNAP_EDGE || result.type === SNAP_CURVEDEDGE) { // Edge

        this.selection1Result.setAttribute("data-i18n", "Edge");
        this.selection1Result.textContent = av.i18n.translate("Edge") + " ~ " + this.measureTool.getEdgeLength(result.geometry);
        this.selection1Result.style.display = "inline-block";
    }
    else if (result.type === SNAP_FACE || result.type === SNAP_CURVEDFACE) { // Face

        this.selection1Result.setAttribute("data-i18n", "Face");
        this.selection1Result.textContent = av.i18n.translate("Face") + " ~ " + this.measureTool.getFaceArea(result.geometry);
        this.selection1Result.style.display = "inline-block";
    }
    else if (result.type === SNAP_CIRCULARARC) { // Circular Arc

        this.selection1Result.setAttribute("data-i18n", "Edge");
        if (result.geometry.radius)
            this.selection1Result.textContent = av.i18n.translate("Edge") + " ~ " + this.measureTool.getCircularArcRadius(result.geometry) + " (R)";
        else
            this.selection1Result.textContent = av.i18n.translate("Edge") + " ~ " + this.measureTool.getEdgeLength(result.geometry);
        this.selection1Result.style.display = "inline-block";
    }

    this.selection1.style.display = "block";
    this.resizeToContent();
};

MeasurePanel.prototype.showSelection2 = function showSelection2() {
    var result = this.measureTool.getSecondGeometry();

    if (result.type === null) {
        return;
    }

    if (result.type === SNAP_VERTEX) { // Vertex

        this.selection2Result.setAttribute("data-i18n", "Vertex");
        this.selection2Result.textContent = av.i18n.translate("Vertex");
        this.selection2Result.style.display = "inline-block";
    }
    else if (result.type === SNAP_EDGE || result.type === SNAP_CURVEDEDGE) { // Edge

        this.selection2Result.setAttribute("data-i18n", "Edge");
        this.selection2Result.textContent = av.i18n.translate("Edge") + " ~ " + this.measureTool.getEdgeLength(result.geometry);
        this.selection2Result.style.display = "inline-block";
    }
    else if (result.type === SNAP_FACE || result.type === SNAP_CURVEDFACE) { // Face

        this.selection2Result.setAttribute("data-i18n", "Face");
        this.selection2Result.textContent = av.i18n.translate("Face") + " ~ " + this.measureTool.getFaceArea(result.geometry);
        this.selection2Result.style.display = "inline-block";
    }
    else if (result.type === SNAP_CIRCULARARC) { // Circular Arc

        this.selection2Result.setAttribute("data-i18n", "Edge");
        if (result.geometry.radius)
            this.selection2Result.textContent = av.i18n.translate("Edge") + " ~ " + this.measureTool.getCircularArcRadius(result.geometry) + " (R)";
        else
            this.selection2Result.textContent = av.i18n.translate("Edge") + " ~ " + this.measureTool.getEdgeLength(result.geometry);
        this.selection2Result.style.display = "inline-block";
    }

    this.selection2.style.display = "block";
    this.resizeToContent();
};

MeasurePanel.prototype.firstSelectionRepick = function firstSelectionRepick() {
    this.measureTool.clearFirstPick();

    this.selection1Result.textContent = this.selection2Result.textContent;
    this.clearSelectionTwo();
    this.clearResult();

    this.resizeToContent();
};

MeasurePanel.prototype.secondSelectionRepick = function secondSelectionRepick() {
    this.measureTool.clearSecondPick();

    this.clearSelectionTwo();
    this.clearResult();

    this.resizeToContent();
};

MeasurePanel.prototype.hideMeasureResult = function hideMeasureResult() {
    this.clearSelectionOne();
    this.clearSelectionTwo();
    this.clearResult();
    this.resizeToContent();
};

MeasurePanel.prototype.disableUnitOption = function disableUnitOption( index ) {

    if (index != null) {
        this.unitList.dropdownElement.children[index].style.display = "none";
    }
    else {  // disable all options
        this.unitList.dropdownElement.disabled = true;
    }
};

MeasurePanel.prototype.showMeasureSettings = function showMeasureSettings() {

    if (this.isSettingsExpanded) {
        this.measureSettings.style.display = "none";
        this.isSettingsExpanded = false;
    }
    else {
        this.measureSettings.style.display = "block";
        this.isSettingsExpanded = true;
    }

    this.resizeToContent();
};

MeasurePanel.prototype.clearSelectionOne = function clearSelectionOne() {
    this.selection1Result.setAttribute("data-i18n", "Select Object");
    this.selection1Result.textContent = av.i18n.translate("Select Object");
};

MeasurePanel.prototype.clearSelectionTwo = function clearSelectionOne() {
    this.selection2Result.setAttribute("data-i18n", "Select Object");
    this.selection2Result.textContent = av.i18n.translate("Select Object");
};

MeasurePanel.prototype.clearResult = function clearResult() {
    this.distIcon.style.display = "none";
    this.angleIcon.style.display = "none";
    this.distanceDiv.style.display = "none";
    this.angleDiv.style.display = "none";
    this.initialDiv.style.display = "inline-block";

    this.deltaButton.style.display = "none";
    this.deltaXDiv.style.display = "none";
    this.deltaYDiv.style.display = "none";
    this.deltaZDiv.style.display = "none";
};

avem.MeasurePanel = MeasurePanel;

})();