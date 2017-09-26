
(function () {

    'use strict';

    var avem = AutodeskNamespace('Autodesk.Viewing.Extensions.MultiMeasureTool'),
        av = Autodesk.Viewing,
        avu = av.UI;

    /**
     * @class
     * Extension used to support distance and angle measure for 2d and 3d models.
     *
     * @tutorial feature_measure
     * @param {Autodesk.Viewing.Viewer3D} viewer - the viewer to be extended.
     * @param {Object} options - An optional dictionary of options for this extension.
     * @alias Autodesk.Viewing.Extensions.Measure.MeasureExtension
     * @constructor
    */
    var MeasureExtension = function (viewer, options) {
        Autodesk.Viewing.Extension.call(this, viewer, options);
    };

    MeasureExtension.prototype = Object.create(Autodesk.Viewing.Extension.prototype);
    MeasureExtension.prototype.constructor = MeasureExtension;


    MeasureExtension.prototype.onToolbarCreated = function () {
        this.viewer.removeEventListener(av.TOOLBAR_CREATED_EVENT, this.bindedOnToolbarCreated);
        this.bindedOnToolbarCreated = null;
        this.createUI();
    };

    /**
     * Load measure extension.
     * @returns {boolean} true if measure extension is loaded successfully.
    */
    MeasureExtension.prototype.load = function () {

        var self = this;
        var viewer = this.viewer;

        this.escapeHotkeyId = 'Autodesk.Measure.Hotkeys.Escape';

        // Register the Measure tool
        if (!viewer.toolController) {
            return false;
        }
        this.tool = new avem.MeasureTool(viewer, {
            onCloseCallback: function (e) {
                self.enableMeasureTool(false);
            }
        });
        viewer.toolController.registerTool(this.tool);

        if (this.viewer.toolbar) {
            this.createUI();
        } else {
            this.bindedOnToolbarCreated = this.onToolbarCreated.bind(this);
            this.viewer.addEventListener(av.TOOLBAR_CREATED_EVENT, this.bindedOnToolbarCreated);
        }

        return true;
    };

    /**
     * Unload measure extension.
     * @returns {boolean} true if measure extension is unloaded successfully.
    */
    MeasureExtension.prototype.unload = function () {
        var viewer = this.viewer;

        // Remove the ui from the viewer.
        this.destroyUI();
        if (this.bindedOnToolbarCreated) {
            this.viewer.removeEventListener(av.TOOLBAR_CREATED_EVENT, this.bindedOnToolbarCreated);
            this.bindedOnToolbarCreated = null;
        }

        // Deregister tool
        viewer.toolController.deregisterTool(this.tool);
        this.tool = null;

        return true;
    };

    /**
     * Whether the measure tool is currently active.
     * @return {Boolean}
     */
    MeasureExtension.prototype.isActive = function () {
        return this.tool.isActive();
    };

    /**
     * Enable/disable the measure tool.
     * @param {boolean} active - true to activate, false to deactivate.
     * @returns {boolean} true if a change in activeness occurred.
     */
    MeasureExtension.prototype.setActive = function (active) {
        return this.enableMeasureTool(active);
    };

    /**
     * Toggles activeness of the measure tool.
     *
     * @return {Boolean} Whether the tool is active
     */
    MeasureExtension.prototype.toggle = function () {
        if (this.isActive()) {
            this.enableMeasureTool(false);
        } else {
            this.enableMeasureTool(true);
        }
        return this.isActive();
    };

    /**
     * Get the current measurement in the measure tool.
     * @param {String} [unitType] - Optional measure unit, [ 'decimal-ft', 'ft', 'ft-and-decimal-in',
     *                            'decimal-in', 'fractional-in', 'm', 'cm', 'mm', 'm-and-cm' ]
     * @param {Number} [precision] - Optional measure precision index,  [ 0 - 0, 1 - 0.1, 2 - 0.01, 3 - 0.001, 4 - 0.0001, 5 - 0.00001 ]
     *                             when units type is 'ft', 'in' or 'fractional-in' [ 0 - 1, 1 - 1/2, 2 - 1/4, 3 - 1/8, 4 - 1/16, 5 - 1/32, 6 - 1/64 ]
     * @return {Object|null} Containing properties of the current measurement, or null.
     */
    MeasureExtension.prototype.getMeasurement = function (unitType, precision) {
        var measurement = null;
        if (this.isActive()) {
            measurement = this.tool.getMeasurement(unitType, precision);
        }
        return measurement;
    };

    /**
     * Get all available units in measure tool.
     *
     * @return {Array} Containing all available units.
    */
    MeasureExtension.prototype.getUnitOptions = function () {
        var units = [
            { name: 'Unknown', type: '' },
            { name: 'Decimal feet', type: 'decimal-ft' },
            { name: 'Feet and fractional inches', type: 'ft' },
            { name: 'Feet and decimal inches', type: 'ft-and-decimal-in' },
            { name: 'Decimal inches', type: 'decimal-in' },
            { name: 'Fractional inches', type: 'fractional-in' },
            { name: 'Meters', type: 'm' },
            { name: 'Centimeters', type: 'cm' },
            { name: 'Millimeters', type: 'mm' },
            { name: 'Meters and centimeters', type: 'm-and-cm' }
        ];

        return units;
    };

    /**
     * Get all available precisions in measure tool.
     * @param {Boolean} isFractional - set true to get fractional precisions
     * @return {Array} Containing all available precisions.
    */
    MeasureExtension.prototype.getPrecisionOptions = function (isFractional) {

        if (isFractional)
            var precisions = ['1', '1/2', '1/4', '1/8', '1/16', '1/32', '1/64'];
        else
            var precisions = ['0', '0.1', '0.01', '0.001', '0.0001', '0.00001'];

        return precisions;
    };

    /**
     * Get the default measure unit in measure tool.
     *
     * @return {String} The default measure unit.
    */
    MeasureExtension.prototype.getDefaultUnit = function () {
        var unit = this.viewer.model.getDisplayUnit();

        return unit;
    };

    /**
     * Enable/disable the measure tool.
     * @param {boolean} enable - true to enable, false to disable.
     * @returns {boolean} true if the tool state was changed.
     * @private
     */
    MeasureExtension.prototype.enableMeasureTool = function (enable) {
        var toolController = this.viewer.toolController,
            isActive = this.tool.isActive();

        this.viewer.impl.disableRollover(enable);

        if (enable && !isActive) {
            toolController.activateTool("measure");
            if (this.measureToolButton) {
                this.measureToolButton.setState(Autodesk.Viewing.UI.Button.State.ACTIVE);
            }
            return true;

        } else if (!enable && isActive) {
            toolController.deactivateTool("measure");
            if (this.measureToolButton) {
                this.measureToolButton.setState(Autodesk.Viewing.UI.Button.State.INACTIVE);
            }
            return true;
        }
        return false;
    };



    /**
 * Create measure button in toolbar.
 * @private
*/
    MeasureExtension.prototype.createUI = function () {
        var self = this;
        var viewer = this.viewer;

        this.measureToolButton = null;

        var toolbar = viewer.getToolbar(true);
        var modelTools = toolbar.getControl(av.TOOLBAR.MODELTOOLSID);

        // Create a button for the measure tool.
        this.measureToolButton = new avu.Button("toolbar-measureTool");
        this.measureToolButton.setToolTip("Measure");
        this.measureToolButton.setIcon("adsk-icon-measure");
        this.measureToolButton.onClick = function (e) {
            self.enableMeasureTool(!self.tool.isActive());
        };
        this.onMeasureButtonStateChange = function (e) {
            if (e.state === avu.Button.State.ACTIVE) {
                self.enableMeasureTool(true);
            } else if (e.state === avu.Button.State.INACTIVE) {
                self.enableMeasureTool(false);
            }
        };
        this.measureToolButton.addEventListener(avu.Button.Event.STATE_CHANGED, this.onMeasureButtonStateChange);

        modelTools.addControl(this.measureToolButton, { index: 0 });

        // Escape hotkey to exit tool.
        //
        var hotkeys = [{
            keycodes: [
                av.theHotkeyManager.KEYCODES.ESCAPE
            ],
            onRelease: function () {
                return self.enableMeasureTool(false);
            }
        }];
        av.theHotkeyManager.pushHotkeys(this.escapeHotkeyId, hotkeys);
    };

    /**
     * Destroy measure button in toolbar.
     * @private
    */
    MeasureExtension.prototype.destroyUI = function () {
        var viewer = this.viewer;

        if (this.measureToolButton) {
            this.measureToolButton.removeEventListener(avu.Button.Event.STATE_CHANGED, this.onMeasureButtonStateChange);
        }

        var toolbar = viewer.getToolbar(false);
        if (toolbar) {
            var modelTools = toolbar.getControl(av.TOOLBAR.MODELTOOLSID);
            if (modelTools) {
                if (this.measureToolButton) {
                    var submenu = modelTools.getControl("toolbar-inspectSubMenu");
                    if (submenu) {
                        submenu.removeControl(this.measureToolButton.getId());
                    } else {
                        modelTools.removeControl(this.measureToolButton.getId());
                    }
                }

                this.measureToolButton = null;
            }
        }

        av.theHotkeyManager.popHotkeys(this.escapeHotkeyId);
    };

    avem.MeasureExtension = MeasureExtension;
    av.theExtensionManager.registerExtension('Autodesk.MultiMeasureTool', MeasureExtension);


})();;





AutodeskNamespace('Autodesk.Viewing.Extensions.MultiMeasureTool');
//
// /** @constructor */
//
//
Autodesk.Viewing.Extensions.MultiMeasureTool.MeasureTool = function (viewer, options) {
    var tool = this;

    var _viewer = viewer;
    var _options = options;

    var _names = ["measure"];
    var _active = false;

    var _firstClick = null;
    var _secondClick = null;
    var _isDragging = false;
    var _interacting = false;
    var _activePoint = 0;
    var _consumeSingleClick = false;
    var _firstClickGeometry = null;
    var _secondClickGeometry = null;

    var _units = "";
    var _precision = 3;
    var _distances = {};

    var _angle = 0;

    var _redraw = false;

    // UI.
    var _indicator = null;
    var _measurePanel = null;
    var _cursor = "url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAACXBIWXMAAAsTAAALEwEAmpwYAAAKT2lDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjanVNnVFPpFj333vRCS4iAlEtvUhUIIFJCi4AUkSYqIQkQSoghodkVUcERRUUEG8igiAOOjoCMFVEsDIoK2AfkIaKOg6OIisr74Xuja9a89+bN/rXXPues852zzwfACAyWSDNRNYAMqUIeEeCDx8TG4eQuQIEKJHAAEAizZCFz/SMBAPh+PDwrIsAHvgABeNMLCADATZvAMByH/w/qQplcAYCEAcB0kThLCIAUAEB6jkKmAEBGAYCdmCZTAKAEAGDLY2LjAFAtAGAnf+bTAICd+Jl7AQBblCEVAaCRACATZYhEAGg7AKzPVopFAFgwABRmS8Q5ANgtADBJV2ZIALC3AMDOEAuyAAgMADBRiIUpAAR7AGDIIyN4AISZABRG8lc88SuuEOcqAAB4mbI8uSQ5RYFbCC1xB1dXLh4ozkkXKxQ2YQJhmkAuwnmZGTKBNA/g88wAAKCRFRHgg/P9eM4Ors7ONo62Dl8t6r8G/yJiYuP+5c+rcEAAAOF0ftH+LC+zGoA7BoBt/qIl7gRoXgugdfeLZrIPQLUAoOnaV/Nw+H48PEWhkLnZ2eXk5NhKxEJbYcpXff5nwl/AV/1s+X48/Pf14L7iJIEyXYFHBPjgwsz0TKUcz5IJhGLc5o9H/LcL//wd0yLESWK5WCoU41EScY5EmozzMqUiiUKSKcUl0v9k4t8s+wM+3zUAsGo+AXuRLahdYwP2SycQWHTA4vcAAPK7b8HUKAgDgGiD4c93/+8//UegJQCAZkmScQAAXkQkLlTKsz/HCAAARKCBKrBBG/TBGCzABhzBBdzBC/xgNoRCJMTCQhBCCmSAHHJgKayCQiiGzbAdKmAv1EAdNMBRaIaTcA4uwlW4Dj1wD/phCJ7BKLyBCQRByAgTYSHaiAFiilgjjggXmYX4IcFIBBKLJCDJiBRRIkuRNUgxUopUIFVIHfI9cgI5h1xGupE7yAAygvyGvEcxlIGyUT3UDLVDuag3GoRGogvQZHQxmo8WoJvQcrQaPYw2oefQq2gP2o8+Q8cwwOgYBzPEbDAuxsNCsTgsCZNjy7EirAyrxhqwVqwDu4n1Y8+xdwQSgUXACTYEd0IgYR5BSFhMWE7YSKggHCQ0EdoJNwkDhFHCJyKTqEu0JroR+cQYYjIxh1hILCPWEo8TLxB7iEPENyQSiUMyJ7mQAkmxpFTSEtJG0m5SI+ksqZs0SBojk8naZGuyBzmULCAryIXkneTD5DPkG+Qh8lsKnWJAcaT4U+IoUspqShnlEOU05QZlmDJBVaOaUt2ooVQRNY9aQq2htlKvUYeoEzR1mjnNgxZJS6WtopXTGmgXaPdpr+h0uhHdlR5Ol9BX0svpR+iX6AP0dwwNhhWDx4hnKBmbGAcYZxl3GK+YTKYZ04sZx1QwNzHrmOeZD5lvVVgqtip8FZHKCpVKlSaVGyovVKmqpqreqgtV81XLVI+pXlN9rkZVM1PjqQnUlqtVqp1Q61MbU2epO6iHqmeob1Q/pH5Z/YkGWcNMw09DpFGgsV/jvMYgC2MZs3gsIWsNq4Z1gTXEJrHN2Xx2KruY/R27iz2qqaE5QzNKM1ezUvOUZj8H45hx+Jx0TgnnKKeX836K3hTvKeIpG6Y0TLkxZVxrqpaXllirSKtRq0frvTau7aedpr1Fu1n7gQ5Bx0onXCdHZ4/OBZ3nU9lT3acKpxZNPTr1ri6qa6UbobtEd79up+6Ynr5egJ5Mb6feeb3n+hx9L/1U/W36p/VHDFgGswwkBtsMzhg8xTVxbzwdL8fb8VFDXcNAQ6VhlWGX4YSRudE8o9VGjUYPjGnGXOMk423GbcajJgYmISZLTepN7ppSTbmmKaY7TDtMx83MzaLN1pk1mz0x1zLnm+eb15vft2BaeFostqi2uGVJsuRaplnutrxuhVo5WaVYVVpds0atna0l1rutu6cRp7lOk06rntZnw7Dxtsm2qbcZsOXYBtuutm22fWFnYhdnt8Wuw+6TvZN9un2N/T0HDYfZDqsdWh1+c7RyFDpWOt6azpzuP33F9JbpL2dYzxDP2DPjthPLKcRpnVOb00dnF2e5c4PziIuJS4LLLpc+Lpsbxt3IveRKdPVxXeF60vWdm7Obwu2o26/uNu5p7ofcn8w0nymeWTNz0MPIQ+BR5dE/C5+VMGvfrH5PQ0+BZ7XnIy9jL5FXrdewt6V3qvdh7xc+9j5yn+M+4zw33jLeWV/MN8C3yLfLT8Nvnl+F30N/I/9k/3r/0QCngCUBZwOJgUGBWwL7+Hp8Ib+OPzrbZfay2e1BjKC5QRVBj4KtguXBrSFoyOyQrSH355jOkc5pDoVQfujW0Adh5mGLw34MJ4WHhVeGP45wiFga0TGXNXfR3ENz30T6RJZE3ptnMU85ry1KNSo+qi5qPNo3ujS6P8YuZlnM1VidWElsSxw5LiquNm5svt/87fOH4p3iC+N7F5gvyF1weaHOwvSFpxapLhIsOpZATIhOOJTwQRAqqBaMJfITdyWOCnnCHcJnIi/RNtGI2ENcKh5O8kgqTXqS7JG8NXkkxTOlLOW5hCepkLxMDUzdmzqeFpp2IG0yPTq9MYOSkZBxQqohTZO2Z+pn5mZ2y6xlhbL+xW6Lty8elQfJa7OQrAVZLQq2QqboVFoo1yoHsmdlV2a/zYnKOZarnivN7cyzytuQN5zvn//tEsIS4ZK2pYZLVy0dWOa9rGo5sjxxedsK4xUFK4ZWBqw8uIq2Km3VT6vtV5eufr0mek1rgV7ByoLBtQFr6wtVCuWFfevc1+1dT1gvWd+1YfqGnRs+FYmKrhTbF5cVf9go3HjlG4dvyr+Z3JS0qavEuWTPZtJm6ebeLZ5bDpaql+aXDm4N2dq0Dd9WtO319kXbL5fNKNu7g7ZDuaO/PLi8ZafJzs07P1SkVPRU+lQ27tLdtWHX+G7R7ht7vPY07NXbW7z3/T7JvttVAVVN1WbVZftJ+7P3P66Jqun4lvttXa1ObXHtxwPSA/0HIw6217nU1R3SPVRSj9Yr60cOxx++/p3vdy0NNg1VjZzG4iNwRHnk6fcJ3/ceDTradox7rOEH0x92HWcdL2pCmvKaRptTmvtbYlu6T8w+0dbq3nr8R9sfD5w0PFl5SvNUyWna6YLTk2fyz4ydlZ19fi753GDborZ752PO32oPb++6EHTh0kX/i+c7vDvOXPK4dPKy2+UTV7hXmq86X23qdOo8/pPTT8e7nLuarrlca7nuer21e2b36RueN87d9L158Rb/1tWeOT3dvfN6b/fF9/XfFt1+cif9zsu72Xcn7q28T7xf9EDtQdlD3YfVP1v+3Njv3H9qwHeg89HcR/cGhYPP/pH1jw9DBY+Zj8uGDYbrnjg+OTniP3L96fynQ89kzyaeF/6i/suuFxYvfvjV69fO0ZjRoZfyl5O/bXyl/erA6xmv28bCxh6+yXgzMV70VvvtwXfcdx3vo98PT+R8IH8o/2j5sfVT0Kf7kxmTk/8EA5jz/GMzLdsAAAAgY0hSTQAAeiUAAICDAAD5/wAAgOkAAHUwAADqYAAAOpgAABdvkl/FRgAAAKZJREFUeNrclLEKwzAQQ9+FgH/Nk7d8ViFT+6cG36IsNXgIdMg5kAoOIw8WSDoDvAEN04BdEhFjgCTR4e6klFxSIgDLSNydbdsAPgRCktRaUylFkfZ0Z2qtVTlnAfugGibwAur3JFrAxoBnYGEy1pGYmQCLLNB6Uqmw182M9eRS0yzqGo+y6D9rytSQR8vM7DKfbtHy4x+/xG8J+d4W9WAi8fxFOwYA8W0ypu2ZfcsAAAAASUVORK5CYII=), auto";

    // Snapper
    var _snapper = null;
    var _firstIntersectPoint = null;
    var _secondIntersectPoint = null;
    var _firstFaceNormal = null;
    var _secondFaceNormal = null;
    var _firstCircularArcCenter = null;
    var _secondCircularArcCenter = null;

    // Isolate Measurement
    var _isolateMeasure = false;
    var _firstClickNode = null;
    var _secondClickNode = null;

    // Multiple Viewports For 2D
    var _firstViewportIndex = null;
    var _secondViewportIndex = null;

    var _hasUI = Autodesk.Viewing.Private.GuiViewer3D && viewer instanceof Autodesk.Viewing.Private.GuiViewer3D;

    var _clip = null;

    this.register = function () {
        if (_hasUI && !_measurePanel) {
            _measurePanel = new Autodesk.Viewing.Extensions.MultiMeasureTool.MeasurePanel(tool, _viewer, "measure-panel", "Measure", options);
            _viewer.addPanel(_measurePanel);
        }

        if (!_snapper) {
            _snapper = new Autodesk.Viewing.Extensions.MultiMeasureTool.Snapper(viewer);
            _viewer.toolController.registerTool(_snapper);
        }
    };

    this.deregister = function () {
        this.deactivate();
        if (_measurePanel) {
            _viewer.removePanel(_measurePanel);
            _measurePanel.uninitialize();
        }

        _viewer.toolController.deregisterTool(_snapper);
        _snapper = null;
    };

    this.isActive = function () {
        return _active;
    };

    this.getNames = function () {
        return _names;
    };

    this.getName = function () {
        return _names[0];
    };

    this.getCursor = function () {
        return (_isDragging && !_interacting) ? null : _cursor;
    };

    function onCameraChange() {
        _indicator.updateLabelPositions();
    }

    function onReset() {
        tool.clearMeasurement();
    }

    this.activate = function () {
        _active = true;
        _activePoint = 0;
        _isDragging = false;

        if (!_units) {
            _units = _viewer.model.getDisplayUnit();
        }

        if (_viewer.model && _viewer.model.is2d()) {
            _precision = 3;
        }
        else {
            _precision = 1;
        }

        activateUI();

        _viewer.clearSelection();
        _viewer.toolController.activateTool("snapper");

        _viewer.addEventListener(Autodesk.Viewing.CAMERA_CHANGE_EVENT, onCameraChange);
        _viewer.addEventListener(Autodesk.Viewing.RESET_EVENT, onReset);
    };

    this.deactivate = function () {
        _active = false;
        _firstClick = _secondClick = null;
        _distances = {};

        this.clearMeasurement();

        deactivateUI();

        if (_snapper && _snapper.isActive()) {
            _viewer.toolController.deactivateTool("snapper");
        }

        _viewer.removeEventListener(Autodesk.Viewing.CAMERA_CHANGE_EVENT, onCameraChange);
        _viewer.removeEventListener(Autodesk.Viewing.RESET_EVENT, onReset);
    };

    this.update = function () {
        return false;
    };

    this.getUnits = function () {
        return _units;
    };

    this.setUnits = function (units) {
        if (_units !== units) {
            _units = units;

            // Update UI
            if (_indicator) {
                _indicator.updateDistance();
                //_indicator.updateLabels();
            }
        }
    };

    this.getPrecision = function () {
        return _precision;
    };

    this.setPrecision = function (precision) {

        if (_precision !== precision) {
            _precision = precision;

            // Update UI
            if (_indicator) {
                _indicator.updateDistance();
                //_indicator.updateLabels();
            }
        }
    };

    this.getDistance = function (name) {

        if (_viewer.model && _viewer.model.isLoadDone()) {
            var d = Autodesk.Viewing.Private.convertUnits(_viewer.model.getUnitString(), _units, _distances[name] || 0);
            return Autodesk.Viewing.Private.formatValueWithUnits(d, _units, 3, _precision);
        }
    };

    this.getAngle = function () {

        return Autodesk.Viewing.Private.formatValueWithUnits(_angle, String.fromCharCode(0xb0), 3, _precision);
    };

    /**
     * TODO: We need to flesh out the return value here.
     *
     * @param unitType
     * @param precision
     * @returns {Object}
     */
    this.getMeasurement = function (unitType, precision) {

        _units = unitType || _units;
        _precision = precision || _precision;

        var geomTypes = ['Vertex', 'Edge', 'Face', 'Circular Arc', 'Curved Edge', 'Curved Face'];

        var measurement = {
            from: geomTypes[this.getFirstGeometry().type],
            to: geomTypes[this.getSecondGeometry().type],
            distance: this.getDistance('xyz'),
            deltaX: this.getDistance('x'),
            deltaY: this.getDistance('y'),
            deltaZ: this.getDistance('z'),
            angle: this.getAngle(),
            unitType: _units,
            precision: _precision
        };
        return measurement;
    };

    this.clearMeasurement = function () {
        _firstClick = _secondClick = null;
        _firstClickGeometry = _secondClickGeometry = null;
        _firstClickNode = _secondClickNode = null;
        _firstViewportIndex = _secondViewportIndex = null;
        _activePoint = 1;
        _distances = {};
        _angle = 0;
        _clip = null;

        if (_indicator) {
            //PIERRE
            _indicator.hide();
        }
        if (_measurePanel) {
            _measurePanel.updatePanel();

            _measurePanel.hideMeasureResult();

            if (_measurePanel.isolateMeasure) {
                this.clearIsolate();
            }
        }
        //if (_viewer.model.is2d() && _snapper) {
        //    _snapper.setClip();
        //}
        if (_viewer.model.is2d()) {
            viewer.impl.updateViewportId(0);

            if (_snapper)
                _snapper.setFirstClickVpId(null);
        }
    };

    this.clearRubberBand = function () {
        _secondClick = null;
        _secondClickGeometry = null;
        _indicator.hideClick('second');
    };

    this.clearFirstPick = function () {
        if (_secondClick) {
            _indicator.hide();

            _firstClick = _secondClick.clone();
            _firstClickGeometry = _secondClickGeometry;
            _firstIntersectPoint = _secondIntersectPoint;
            _firstFaceNormal = _secondFaceNormal;
            _firstClickNode = _secondClickNode;
            _firstViewportIndex = _secondViewportIndex;
            _firstCircularArcCenter = _secondCircularArcCenter;

            //if (_viewer.model.is2d()) {
            //    _indicator.drawGreyOutPlane(_firstViewportIndex);
            //
            //    // Need to pass the clip to Snapper (disable snapper in greying out area), only snap in the clip
            //    if (_snapper)
            //        _snapper.setClip(_clip);
            //}
            if (_viewer.model.is2d()) {
                // Pass viewport Id to LineShader to make all other geometries with different viewport transparent
                viewer.impl.updateViewportId(_firstViewportIndex);

                if (_snapper)
                    _snapper.setFirstClickVpId(_firstViewportIndex);
            }

            // redraw the first pick
            _redraw = true;
            if (_firstClickGeometry === SNAP_VERTEX) {
                _indicator.showFirstVertex(_firstClick);
            }
            else if (_firstClickGeometry === SNAP_EDGE) {
                _indicator.showFirstEdge(_firstClick, _firstIntersectPoint);
            }
            else if (_firstClickGeometry === SNAP_FACE) {
                _indicator.showFirstFace(_firstClick, _firstIntersectPoint);
            }
            else if (_firstClickGeometry === SNAP_CIRCULARARC) {

                _firstClick.center = _secondClick.center;
                _firstClick.radius = _secondClick.radius;
                _indicator.showFirstEdge(_firstClick, _firstIntersectPoint);
            }
            else if (_firstClickGeometry === SNAP_CURVEDFACE) {

                _indicator.showFirstFace(_firstClick, _firstIntersectPoint);
            }
            _redraw = false;

            _secondClick = null;
            _secondClickGeometry = null;
            _secondClickNode = null;
            _secondViewportIndex = null;
            _secondCircularArcCenter = null;
            _activePoint = 2;
            _distances = {};
            _angle = 0;

            if (_measurePanel && _measurePanel.isolateMeasure) {
                this.clearIsolate();
            }
        }
        else {
            this.clearMeasurement();
        }

        if (_measurePanel) _measurePanel.showSelection1();
    };

    this.clearSecondPick = function () {
        _secondClick = null;
        _secondClickGeometry = null;
        _secondClickNode = null;
        _secondViewportIndex = null;
        _activePoint = 2;
        _distances = {};
        _angle = 0;
        _indicator.hideClick('second');

        if (_measurePanel && _measurePanel.isolateMeasure) {
            this.clearIsolate();
        }

        if (_viewer.model.is2d()) {
            // Pass viewport Id to LineShader to make all other geometries with different viewport transparent
            viewer.impl.updateViewportId(_firstViewportIndex);

            if (_snapper)
                _snapper.setFirstClickVpId(_firstViewportIndex);
        }
    };

    this.getIndicator = function () {
        return _indicator;
    };

    this.getFirstGeometry = function () {
        return { "type": _firstClickGeometry, "geometry": _firstClick };
    };

    this.getSecondGeometry = function () {
        return { "type": _secondClickGeometry, "geometry": _secondClick };
    };

    this.getEdgeLength = function (edge) {
        return _indicator.getEdgeLength(edge);
    };

    this.getFaceArea = function (face) {
        return _indicator.getFaceArea(face);
    };

    this.getCircularArcRadius = function (edge) {
        return _indicator.getCircularArcRadius(edge);
    };

    this.isolateMeasurement = function () {
        if (_firstClickNode && _secondClickNode) {
            var nodeList = [_firstClickNode, _secondClickNode];
            _viewer.isolate(nodeList);
        }
    };

    this.clearIsolate = function () {
        _viewer.showAll();
    };

    this.isIdenticalEdges = function () {

        if (_firstClick.vertices.length === _secondClick.vertices.length) {

            for (var i = 0; i < _firstClick.vertices.length; i++) {
                if (!_firstClick.vertices[i].equals(_secondClick.vertices[i])) {
                    return false;
                }
            }
            return true;
        }

        return false;
    };

    this.isIdenticalFaces = function () {

        if (_firstClick.faceId && _secondClick.faceId) {
            if (_firstClick.fragId === _secondClick.fragId && _firstClick.faceId === _secondClick.faceId) {
                return true;
            }
        }
        else {
            if (_firstClick.vertices.length === _secondClick.vertices.length) {

                for (var i = 0; i < _firstClick.vertices.length; i++) {
                    if (!_firstClick.vertices[i].equals(_secondClick.vertices[i])) {
                        return false;
                    }
                }
                return true;
            }
        }

        return false;
    };

    this.isIdenticalGeometries = function () {

        if (_firstClickGeometry === _secondClickGeometry) {

            switch (_firstClickGeometry) {

                case SNAP_VERTEX:
                    if (_firstClick.equals(_secondClick))
                        return true;
                    break;
                case SNAP_EDGE: return this.isIdenticalEdges(); break;
                case SNAP_FACE: return this.isIdenticalFaces(); break;
                case SNAP_CIRCULARARC: return this.isIdenticalEdges(); break;
                case SNAP_CURVEDEDGE: return this.isIdenticalEdges(); break;
                case SNAP_CURVEDFACE: return this.isIdenticalFaces(); break;
                default: break;
            }
        }

        return false;
    };

    // ------------------------
    // Event handler callbacks:
    // These can use "this".

    this._handleMouseEvent = function (event) {

        if (_snapper.isSnapped()) {  // ray cast has intersection with mesh
            if (_activePoint === 0) {
                this.clearMeasurement();
                _activePoint = 1;
            }

            if (_activePoint === 1) {  // First Pick

                _firstViewportIndex = _snapper.getViewportIndex();
                _firstClickGeometry = _snapper.getHighlightGeometry();
                _firstIntersectPoint = _snapper.getIntersectPoint();

                //if (_viewer.model.is2d()) {
                //    _indicator.drawGreyOutPlane(_firstViewportIndex);
                //
                //    // Need to pass the clip to Snapper (disable snapper in greying out area), only snap in the clip
                //    if (_snapper)
                //        _snapper.setClip(_clip);
                //}

                // Only snap the geometries which belong to the same viewport as the first selection
                if (_viewer.model.is2d()) {
                    // Pass viewport Id to LineShader to make all other geometries with different viewport transparent
                    viewer.impl.updateViewportId(_firstViewportIndex);

                    if (_snapper)
                        _snapper.setFirstClickVpId(_firstViewportIndex);
                }

                _firstClick = _snapper.getGeometry();

                if (_firstClickGeometry === SNAP_VERTEX) {

                    _indicator.showFirstVertex(_firstClick);
                }
                else if (_firstClickGeometry === SNAP_EDGE || _firstClickGeometry === SNAP_CURVEDEDGE) {

                    _indicator.showFirstEdge(_firstClick, _firstIntersectPoint);
                }
                else if (_firstClickGeometry === SNAP_FACE) {

                    _firstFaceNormal = _snapper.getFaceNormal();
                    _indicator.showFirstFace(_firstClick, _firstIntersectPoint);
                }
                else if (_firstClickGeometry === SNAP_CIRCULARARC) {

                    // TODO: need to get rid of _firstCircularArcCenter, use _firstClick.center instead.
                    _firstCircularArcCenter = _snapper.getCircularArcCenter();
                    _firstClick.center = _snapper.getCircularArcCenter();
                    _firstClick.radius = _snapper.getCircularArcRadius();
                    _indicator.showFirstEdge(_firstClick, _firstIntersectPoint);
                }
                else if (_firstClickGeometry === SNAP_CURVEDFACE) {

                    _indicator.showFirstFace(_firstClick, _firstIntersectPoint);
                }

                _firstClickNode = _snapper.getSnapNode();
                if (_measurePanel) _measurePanel.showSelection1();

            } else if (_activePoint === 2) { // Second Pick

                var result = null; // result = [endPoint, endPoint] or result = angle

                _secondClickGeometry = _snapper.getHighlightGeometry();
                _secondIntersectPoint = _snapper.getIntersectPoint();

                _secondClick = _snapper.getGeometry();

                if (_secondClickGeometry === SNAP_CIRCULARARC) {
                    _secondClick.center = _snapper.getCircularArcCenter();
                    _secondClick.radius = _snapper.getCircularArcRadius();
                }

                // Do not measure between identical geometries since the measurement is always 0.
                if (this.isIdenticalGeometries()) {
                    return false;
                }

                if (_firstClickGeometry === SNAP_VERTEX && _secondClickGeometry === SNAP_VERTEX) { // do vertex to vertex measure

                    _indicator.showSecondVertex(_secondClick);

                    _indicator.drawLine(_firstClick, _secondClick);

                    result = [_firstClick, _secondClick];

                }
                else if (_firstClickGeometry === SNAP_EDGE && _secondClickGeometry === SNAP_EDGE) { // do edge to edge measure

                    _indicator.showSecondEdge(_secondClick, _secondIntersectPoint);

                    result = _indicator.edgeToEdgeMeasure(_secondClick, _firstClick, _secondIntersectPoint);

                }
                else if (_firstClickGeometry === SNAP_FACE && _secondClickGeometry === SNAP_FACE) { // do face to face measure

                    _secondFaceNormal = _snapper.getFaceNormal();
                    _indicator.showSecondFace(_secondClick, _secondIntersectPoint);

                    result = _indicator.faceToFaceMeasure(_firstIntersectPoint, _firstFaceNormal, _secondIntersectPoint, _secondFaceNormal);

                }
                else if (_firstClickGeometry === SNAP_VERTEX && _secondClickGeometry === SNAP_EDGE) { // do vertex to edge measure

                    _indicator.showSecondEdge(_secondClick, _secondIntersectPoint);

                    result = _indicator.pointToEdgeMeasure(_firstClick, _secondClick, _secondIntersectPoint);

                }
                else if (_firstClickGeometry === SNAP_EDGE && _secondClickGeometry === SNAP_VERTEX) { // do edge to vertex measure

                    _indicator.showSecondVertex(_secondClick);

                    result = _indicator.edgeToPointMeasure(_firstClick, _secondClick);

                }
                else if (_firstClickGeometry === SNAP_VERTEX && _secondClickGeometry === SNAP_FACE) { // do vertex to face measure

                    _secondFaceNormal = _snapper.getFaceNormal();
                    _indicator.showSecondFace(_secondClick, _secondIntersectPoint);

                    result = _indicator.pointToFaceMeasure(_firstClick, _secondClick, _secondFaceNormal, _secondIntersectPoint);

                }
                else if (_firstClickGeometry === SNAP_FACE && _secondClickGeometry === SNAP_VERTEX) { // do face to vertex measure

                    _indicator.showSecondVertex(_secondClick);

                    result = _indicator.faceToPointMeasure(_firstClick, _firstFaceNormal, _firstIntersectPoint, _secondClick);

                }
                else if (_firstClickGeometry === SNAP_EDGE && _secondClickGeometry === SNAP_FACE) { // do edge to face measure

                    _secondFaceNormal = _snapper.getFaceNormal();
                    _indicator.showSecondFace(_secondClick, _secondIntersectPoint);

                    result = _indicator.edgeToFaceMeasure(_firstClick, _firstIntersectPoint, _secondClick, _secondFaceNormal, _secondIntersectPoint);

                }
                else if (_firstClickGeometry === SNAP_FACE && _secondClickGeometry === SNAP_EDGE) { // do face to edge measure

                    _indicator.showSecondEdge(_secondClick, _secondIntersectPoint);

                    result = _indicator.faceToEdgeMeasure(_firstClick, _firstFaceNormal, _firstIntersectPoint, _secondClick, _secondIntersectPoint);

                }
                else if (_firstClickGeometry === SNAP_CIRCULARARC && _secondClickGeometry === SNAP_CIRCULARARC) { // do circular arc to circular arc measure

                    _secondCircularArcCenter = _snapper.getCircularArcCenter();

                    // When circular arcs have same center, measure the radius of arc instead of the distance of two centers
                    if (_firstCircularArcCenter.equals(_secondCircularArcCenter)) {
                        _secondClick = _indicator.nearestVertexInVertexToEdge(_secondIntersectPoint, _secondClick);
                        _secondClickGeometry = SNAP_VERTEX;

                        _indicator.showSecondVertex(_secondClick);

                        _indicator.drawLine(_firstCircularArcCenter, _secondClick);

                        result = [_firstCircularArcCenter, _secondClick];
                    }
                    else {
                        _indicator.showSecondEdge(_secondClick, _secondIntersectPoint);
                        _indicator.drawLine(_firstCircularArcCenter, _secondCircularArcCenter);

                        result = [_firstCircularArcCenter, _secondCircularArcCenter];
                    }
                }
                else if (_firstClickGeometry === SNAP_CIRCULARARC && _secondClickGeometry === SNAP_VERTEX) { // do circular arc to vertex measure

                    _indicator.showSecondVertex(_secondClick);

                    _indicator.drawLine(_firstCircularArcCenter, _secondClick);

                    result = [_firstCircularArcCenter, _secondClick];

                }
                else if (_firstClickGeometry === SNAP_VERTEX && _secondClickGeometry === SNAP_CIRCULARARC) { // do vertex to circular arc measure

                    _secondCircularArcCenter = _snapper.getCircularArcCenter();
                    _indicator.showSecondEdge(_secondClick, _secondIntersectPoint);

                    _indicator.drawLine(_firstClick, _secondCircularArcCenter);

                    result = [_firstClick, _secondCircularArcCenter];
                }
                else if (_firstClickGeometry === SNAP_CIRCULARARC && _secondClickGeometry === SNAP_EDGE) { // do circular arc to edge measure

                    _indicator.showSecondEdge(_secondClick, _secondIntersectPoint);

                    result = _indicator.pointToEdgeMeasure(_firstCircularArcCenter, _secondClick, _secondIntersectPoint);

                }
                else if (_firstClickGeometry === SNAP_EDGE && _secondClickGeometry === SNAP_CIRCULARARC) { // do edge to circular arc measure

                    _secondCircularArcCenter = _snapper.getCircularArcCenter();
                    _indicator.showSecondEdge(_secondClick, _secondIntersectPoint);

                    result = _indicator.edgeToPointMeasure(_firstClick, _secondCircularArcCenter);

                }
                else if (_firstClickGeometry === SNAP_CIRCULARARC && _secondClickGeometry === SNAP_FACE) { // do circular arc to face measure

                    _secondFaceNormal = _snapper.getFaceNormal();
                    _indicator.showSecondFace(_secondClick, _secondIntersectPoint);

                    result = _indicator.pointToFaceMeasure(_firstCircularArcCenter, _secondClick, _secondFaceNormal, _secondIntersectPoint);
                }
                else if (_firstClickGeometry === SNAP_FACE && _secondClickGeometry === SNAP_CIRCULARARC) { // do face to circular arc measure

                    _secondCircularArcCenter = _snapper.getCircularArcCenter();
                    _indicator.showSecondEdge(_secondClick, _secondIntersectPoint);

                    result = _indicator.faceToPointMeasure(_firstClick, _firstFaceNormal, _firstIntersectPoint, _secondCircularArcCenter);
                }
                    // Below is for curved edge and curved face measure
                else if (_firstClickGeometry === SNAP_CURVEDEDGE && _secondClickGeometry === SNAP_VERTEX) { // do curved edge to vertex measure

                    _indicator.showSecondVertex(_secondClick);

                    result = _indicator.curvedEdgeToVertexMeasure(_firstClick, _secondClick);
                }
                else if (_firstClickGeometry === SNAP_VERTEX && _secondClickGeometry === SNAP_CURVEDEDGE) { // do vertex to curved edge measure

                    _indicator.showSecondEdge(_secondClick, _secondIntersectPoint);

                    result = _indicator.curvedEdgeToVertexMeasure(_secondClick, _firstClick);
                }
                else if (_firstClickGeometry === SNAP_CURVEDEDGE && _secondClickGeometry === SNAP_CIRCULARARC) { // do curved edge to circular arc measure

                    _secondCircularArcCenter = _snapper.getCircularArcCenter();
                    _indicator.showSecondEdge(_secondClick, _secondIntersectPoint);

                    result = _indicator.curvedEdgeToVertexMeasure(_firstClick, _secondCircularArcCenter);
                }
                else if (_firstClickGeometry === SNAP_CIRCULARARC && _secondClickGeometry === SNAP_CURVEDEDGE) { // do circular arc to curved edge measure

                    _indicator.showSecondEdge(_secondClick, _secondIntersectPoint);

                    result = _indicator.curvedEdgeToVertexMeasure(_secondClick, _firstCircularArcCenter);
                }
                else if (_firstClickGeometry === SNAP_CURVEDEDGE && _secondClickGeometry === SNAP_EDGE) { // do curved edge to edge measure

                    _indicator.showSecondEdge(_secondClick, _secondIntersectPoint);

                    result = _indicator.curvedEdgeToEdgeMeasure(_firstClick, _secondClick);
                }
                else if (_firstClickGeometry === SNAP_EDGE && _secondClickGeometry === SNAP_CURVEDEDGE) { // do edge to curved edge measure

                    _indicator.showSecondEdge(_secondClick, _secondIntersectPoint);

                    result = _indicator.curvedEdgeToEdgeMeasure(_secondClick, _firstClick);
                }
                else if (_firstClickGeometry === SNAP_CURVEDEDGE && _secondClickGeometry === SNAP_CURVEDEDGE) { // do curved edge to curved edge measure

                    _indicator.showSecondEdge(_secondClick, _secondIntersectPoint);

                    result = _indicator.curvedEdgeToCurvedEdgeMeasure(_firstClick, _secondClick);
                }
                else if (_firstClickGeometry === SNAP_CURVEDEDGE && (_secondClickGeometry === SNAP_FACE || _secondClickGeometry === SNAP_CURVEDFACE)) { // do curved edge to face/curvedFace measure

                    _indicator.showSecondFace(_secondClick, _secondIntersectPoint);

                    result = _indicator.curvedEdgeToFaceMeasure(_firstClick, _secondClick);
                }
                else if ((_firstClickGeometry === SNAP_FACE || _firstClickGeometry === SNAP_CURVEDFACE) && _secondClickGeometry === SNAP_CURVEDEDGE) { // do face/curvedFace to curved edge measure

                    _indicator.showSecondEdge(_secondClick, _secondIntersectPoint);

                    result = _indicator.curvedEdgeToFaceMeasure(_secondClick, _firstClick);
                }
                else if (_firstClickGeometry === SNAP_CURVEDFACE && _secondClickGeometry === SNAP_VERTEX) { // do curved face to vertex measure

                    _indicator.showSecondVertex(_secondClick);

                    result = _indicator.curvedFaceToVertexMeasure(_firstClick, _secondClick);
                }
                else if (_firstClickGeometry === SNAP_VERTEX && _secondClickGeometry === SNAP_CURVEDFACE) { // do vertex to curved face measure

                    _indicator.showSecondFace(_secondClick, _secondIntersectPoint);

                    result = _indicator.curvedFaceToVertexMeasure(_secondClick, _firstClick);
                }
                else if (_firstClickGeometry === SNAP_CURVEDFACE && _secondClickGeometry === SNAP_CIRCULARARC) { // do curved face to circular arc measure

                    _secondCircularArcCenter = _snapper.getCircularArcCenter();
                    _indicator.showSecondEdge(_secondClick, _secondIntersectPoint);

                    result = _indicator.curvedFaceToVertexMeasure(_firstClick, _secondCircularArcCenter);
                }
                else if (_firstClickGeometry === SNAP_CIRCULARARC && _secondClickGeometry === SNAP_CURVEDFACE) { // do circular arc to curved face measure

                    _indicator.showSecondFace(_secondClick, _secondIntersectPoint);

                    result = _indicator.curvedFaceToVertexMeasure(_secondClick, _firstCircularArcCenter);
                }
                else if (_firstClickGeometry === SNAP_CURVEDFACE && _secondClickGeometry === SNAP_EDGE) { // do curved face to edge measure

                    _indicator.showSecondEdge(_secondClick, _secondIntersectPoint);

                    result = _indicator.curvedEdgeToFaceMeasure(_secondClick, _firstClick);
                }
                else if (_firstClickGeometry === SNAP_EDGE && _secondClickGeometry === SNAP_CURVEDFACE) { // do edge to curved face measure

                    _indicator.showSecondFace(_secondClick, _secondIntersectPoint);

                    result = _indicator.curvedEdgeToFaceMeasure(_firstClick, _secondClick);
                }
                else if (_firstClickGeometry === SNAP_CURVEDFACE && (_secondClickGeometry === SNAP_FACE || _secondClickGeometry === SNAP_CURVEDFACE)) { // do curved face to face/curved face measure

                    _indicator.showSecondFace(_secondClick, _secondIntersectPoint);

                    result = _indicator.curvedFaceToFaceMeasure(_firstClick, _secondClick);
                }
                else if (_firstClickGeometry === SNAP_FACE && _secondClickGeometry === SNAP_CURVEDFACE) { // do face to curved face measure

                    _indicator.showSecondFace(_secondClick, _secondIntersectPoint);

                    result = _indicator.curvedFaceToFaceMeasure(_firstClick, _secondClick);
                }

                if (_consumeSingleClick) {

                    if (result.length === undefined) {

                        _angle = result;

                        if (_measurePanel) _measurePanel.showAngleResult();
                    }
                    else {

                        var ep1 = result[0].clone();
                        var ep2 = result[1].clone();

                        if (_viewer.model.is2d()) {
                            _viewer.model.pageToModel(ep1, ep2, _firstViewportIndex);
                        }

                        _distances.xyz = ep1.distanceTo(ep2);
                        _distances.x = Math.abs(ep1.x - ep2.x);
                        _distances.y = Math.abs(ep1.y - ep2.y);
                        _distances.z = Math.abs(ep1.z - ep2.z);

                        if (_measurePanel) {
                            // Add hideXYZ option because parallel faces should only display distance, not XYZ per Fusion's request
                            if (_firstClickGeometry === SNAP_FACE && _secondClickGeometry === SNAP_FACE)
                                _measurePanel.showDistanceResult(true);
                            else
                                _measurePanel.showDistanceResult();
                        }
                    }

                    if (_measurePanel) {
                        _measurePanel.showSelection2();
                        _measurePanel.updatePanel();
                    }
                    _indicator.updateDistance();
                    _indicator.updateAngle();

                    _secondClickNode = _snapper.getSnapNode();
                    _secondViewportIndex = _snapper.getViewportIndex();

                    if (_measurePanel && _measurePanel.isolateMeasure) {
                        this.isolateMeasurement();
                    }

                    // Clear the clip in snapper (enable snapper in greying out area) after the
                    // second selection, then user can select the objects in greying out area.
                    //if (_viewer.model.is2d() && _snapper)
                    //    _snapper.setClip();

                    if (_viewer.model.is2d()) {
                        viewer.impl.updateViewportId(0);

                        if (_snapper)
                            _snapper.setFirstClickVpId(null);
                    }
                }

                _indicator.updateLabelPositions();

            }
            return true;
        }
        else {  // show "rubber band" even when user is NOT over any 2nd pick geometry
            if (_activePoint === 2) {
                var cursorPosition = this.inverseProject(event.canvasX, event.canvasY);

                //if (_viewer.model.is2d() && !_viewer.model.pointInPolygon(cursorPosition.x, cursorPosition.y, _clip.contours, _clip.points))
                //    return false;

                if (_firstClickGeometry === SNAP_VERTEX) { // do vertex to vertex measure

                    _indicator.drawLine(_firstClick, cursorPosition);

                }
                else if (_firstClickGeometry === SNAP_EDGE) { // do edge to vertex measure

                    _indicator.edgeToPointMeasure(_firstClick, cursorPosition);

                }
                else if (_firstClickGeometry === SNAP_FACE) { // do face to vertex measure

                    _indicator.faceToPointMeasure(_firstClick, _firstFaceNormal, _firstIntersectPoint, cursorPosition);

                }
                else if (_firstClickGeometry === SNAP_CIRCULARARC) { // do circular arc to vertex measure

                    _indicator.drawLine(_firstCircularArcCenter, cursorPosition);

                }
                else if (_firstClickGeometry === SNAP_CURVEDEDGE) { // do curved edge to vertex measure

                    _indicator.curvedEdgeToVertexMeasure(_firstClick, cursorPosition);
                }
                else if (_firstClickGeometry === SNAP_CURVEDFACE) { // do curved face to vertex measure

                    _indicator.curvedFaceToVertexMeasure(_firstClick, cursorPosition);
                }
            }
        }
        return false;
    };

    this.inverseProject = function (canvasX, canvasY) {

        var camera = _viewer.navigation.getCamera(),
            containerBounds = _viewer.navigation.getScreenViewport(),
            p = new THREE.Vector3();

        p.x = canvasX / containerBounds.width * 2 - 1;
        p.y = -(canvasY / containerBounds.height * 2 - 1);
        p.z = 0;

        p = p.unproject(camera);

        return p;
    };

    this.handleButtonDown = function (event, button) {
        _isDragging = true;
        if (button === 0 && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) {

            _consumeSingleClick = true;
        }
        return false;
    };

    this.handleMouseMove = function (event) {
        _consumeSingleClick = false;
        if (_activePoint === 2) {
            this.clearRubberBand();
            this._handleMouseEvent(event);
        }
        return false;
    };

    this.handleButtonUp = function (event, button) {
        _isDragging = false;
        return false;
    };

    this.handleSingleClick = function (event, button) {
        if (_consumeSingleClick) {

            if (!this._handleMouseEvent(event)) {
                this.clearMeasurement();
                _activePoint = 0;
            }

            if (_activePoint === 1 || _activePoint === 2) {
                _activePoint = (_activePoint === 1) ? 2 : 0;
            }

            _consumeSingleClick = false;
        }
        return true;
    };

    this.handleDoubleClick = function (event, button) {
        return true;
    };

    this.handleWheelInput = function (delta) {
        _indicator.updateScale();
        return false;
    };

    this.handleSingleTap = function (event) {
        return this.handleSingleClick(event);
    };

    this.handleDoubleTap = function (event) {
        return true;
    };

    this.handleResize = function () {
        if (_indicator) {
            _indicator.updateLabelPositions();
        }
    };

    // Create UI and initially hide it.
    function activateUI() {
        if (!_indicator) {
            _indicator = new Indicator(_viewer);
        }
        _indicator.hide();

        if (_measurePanel) {
            _measurePanel.setVisible(true);
            _measurePanel.updatePanel();

            if (_viewer.model && _viewer.model.is2d()) {
                _measurePanel.isolate.setVisibility(false);
            }

            if (!_units) {
                _measurePanel.disableUnitOption();
            }
            else {
                _measurePanel.disableUnitOption(0);  // disable "Unknown" option when the model has units
            }
        }
    }

    function deactivateUI() {
        if (_indicator) {
            _indicator.hide();
            _indicator.destroy();
        }

        _distances = {};

        if (_measurePanel) {
            _measurePanel.setVisible(false);
            _measurePanel.updatePanel();
        }
    }







    //Region Indicator

    // /** @constructor */
    function Indicator(viewer) {
        var that = this,
            _simple = false,
            kIndicatorColor = 0x1E8FFF,
            kIndicatorOpacity = 0.7,
            kEndPointOverlayName = 'MeasureTool-endPoint',
            kEdgeOverlayName = 'MeasureTool-edge',
            kFaceOverlayName = 'MeasureTool-face',
            kAngleOverlayName = 'MeasureTool-angle',
            kAngleOutlineOverlayName = 'MeasureTool-angle-outline',
            kExtensionLineOverlayName = 'MeasureTool-extensionLine',
            kExtensionFaceOverlayName = 'MeasureTool-extensionFace',
            kGreyOutPlaneOverlayName = 'MeasureTool-greyOutPlane',
            _materialPoint = null,
            _materialLine = null,
            _materialFace = null,
            _materialAngle = null,
            _materialAngleOutline = null,
            _materialExtensionLine = null,
            _materialExtensionFace = null,
            _materialGreyOutPlane = null,
            _endPoints = { first: {}, second: {} },
            _edges = { first: {}, second: {} },
            _faces = { first: {}, second: {} },
            _lines = {
                xyz: { axis: false, color: 'FF9900' },
                x: { axis: true, color: 'F12C2C' },
                y: { axis: true, color: '0BB80B' },
                z: { axis: true, color: '2C2CF1' }
            },
            _angleLabel = {},
            _labels = [],
            kHudOffset = 4; //pixels


        this.showFirstVertex = function (position) {
            var scale = this.setScale(position);
            this.showEndPoint('first', position, scale);
        };

        this.showSecondVertex = function (position) {
            var scale = this.setScale(position);
            this.showEndPoint('second', position, scale);
        };

        this.showEndPoint = function (name, position, scale) {
            if (!_materialPoint) {
                _materialPoint = new THREE.MeshPhongMaterial({
                    color: kIndicatorColor,
                    ambient: kIndicatorColor,
                    opacity: kIndicatorOpacity,
                    transparent: true,
                    depthTest: false,
                    depthWrite: false
                });

                _viewer.impl.createOverlayScene(kEndPointOverlayName);
            }

            var endPoint = _endPoints[name],
                mesh = endPoint.mesh;

            if (!mesh) {
                endPoint.geometry = new THREE.SphereGeometry(1.0);
                mesh = endPoint.mesh = new THREE.Mesh(endPoint.geometry, _materialPoint);
                _viewer.impl.addOverlay(kEndPointOverlayName, mesh);
            }

            mesh.scale.x = scale;
            mesh.scale.y = scale;
            mesh.scale.z = scale;
            mesh.position.set(position.x, position.y, position.z);
            mesh.visible = true;

            _viewer.impl.invalidate(false, false, /*overlayDirty=*/true);

            if (_consumeSingleClick || _redraw) {

                var label = endPoint.label;
                if (!label) {

                    label = endPoint.label = document.createElement('div');
                    label.className = 'measure-label';
                    _viewer.container.appendChild(label);

                    label.style.pointerEvents = 'none';

                    var label_icon = document.createElement('div');
                    label_icon.className = 'adsk-icon-' + name + ' measure-label-icon';
                    label.appendChild(label_icon);
                }

                label.classList.toggle('visible', true);

                endPoint.position = position.clone();

                this.updateLabelPositions();
            }
        };

        // Set scale for vertex and extension dashed line
        this.setScale = function (point) {

            var pixelSize = 5;

            var navapi = _viewer.navigation;
            var camera = navapi.getCamera();

            var view = navapi.getEyeVector();
            var position = navapi.getPosition();

            var p = point.clone();

            var distance = camera.isPerspective ? p.sub(position).dot(view.normalize())
                : navapi.getEyeVector().length();

            var fov = navapi.getVerticalFov();
            var worldHeight = 2.0 * distance * Math.tan(THREE.Math.degToRad(fov * 0.5));

            var viewport = navapi.getScreenViewport();
            var devicePixelRatio = window.devicePixelRatio || 1;
            var scale = pixelSize * worldHeight / (viewport.height * devicePixelRatio);

            return scale;
        };

        // Update scale for vertex, edge, line and extension dash line
        this.updateScale = function () {

            var overlay = _viewer.impl.overlayScenes[kEndPointOverlayName];
            if (overlay) {
                var scene = overlay.scene;

                for (var i = 0; i < scene.children.length; i++) {
                    var pointMesh = scene.children[i];
                    if (pointMesh) {

                        var scale = this.setScale(pointMesh.position);
                        pointMesh.scale.x = scale;
                        pointMesh.scale.y = scale;
                        pointMesh.scale.z = scale;
                    }
                }
            }

            overlay = _viewer.impl.overlayScenes[kExtensionLineOverlayName];
            if (overlay) {
                var scene = overlay.scene;

                for (var i = 0; i < scene.children.length; i++) {
                    var extensionLine = scene.children[i];
                    if (extensionLine) {

                        var dashScale = this.setScale(extensionLine.geometry.vertices[0]);
                        extensionLine.material.dashSize = dashScale * 4;
                        extensionLine.material.gapSize = dashScale * 2;
                    }
                }
            }

            overlay = _viewer.impl.overlayScenes[kEdgeOverlayName];
            if (overlay) {
                var scene = overlay.scene;

                for (var i = 0; i < scene.children.length; i++) {
                    var cylinderMesh = scene.children[i];
                    if (cylinderMesh) {
                        this.setCylinderScale(cylinderMesh);
                    }
                }
            }

            overlay = _viewer.impl.overlayScenes[kAngleOutlineOverlayName];
            if (overlay) {
                var scene = overlay.scene;

                for (var i = 0; i < scene.children.length; i++) {
                    var cylinderMesh = scene.children[i];
                    if (cylinderMesh) {
                        this.setCylinderScale(cylinderMesh);
                    }
                }
            }

            for (var name in _lines) {
                if (_lines.hasOwnProperty(name)) {
                    var item = _lines[name];
                    if (item.line) {
                        this.setCylinderScale(item.line);
                    }
                }
            }
        };

        this.showFirstEdge = function (geom, point) {
            this.showEdge('first', geom, point);
        };

        this.showSecondEdge = function (geom, point) {
            this.showEdge('second', geom, point);
        };

        this.showEdge = function (name, geom, point) {

            if (!_materialLine) {

                _materialLine = new THREE.MeshPhongMaterial({
                    color: kIndicatorColor,
                    ambient: kIndicatorColor,
                    opacity: kIndicatorOpacity,
                    transparent: true,
                    depthTest: false,
                    depthWrite: false,
                    side: THREE.DoubleSide
                });

                _viewer.impl.createOverlayScene(kEdgeOverlayName);
            }

            var edge = _edges[name];

            if (edge.line) {
                _viewer.impl.removeMultipleOverlays(kEdgeOverlayName, edge.line);
            }

            edge.line = this.drawEdgeAsCylinder(geom, _materialLine, 5, 1);
            _viewer.impl.addMultipleOverlays(kEdgeOverlayName, edge.line);

            if (_consumeSingleClick || _redraw) {

                var label = edge.label;
                if (!label) {

                    label = edge.label = document.createElement('div');
                    label.className = 'measure-label';
                    _viewer.container.appendChild(label);

                    label.style.pointerEvents = 'none';

                    // Stop showing length of edges per Jay's request
                    //var label_text = document.createElement('div');
                    //label_text.className = 'measure-label-text';
                    //label.appendChild(label_text);
                    var label_icon = document.createElement('div');
                    label_icon.className = 'adsk-icon-' + name + ' measure-label-icon';
                    label.appendChild(label_icon);
                }

                //label.children[0].textContent = this.getEdgeLength(geom);
                label.classList.toggle('visible', true);

                edge.intersectPoint = point.clone();

                this.updateLabelPositions();
            }
        };

        // This is a workaround to deal with the limitation on linewidth on Windows due to the ANGLE library
        this.drawEdgeAsCylinder = function (geom, material, linewidth, type) {

            // The array for all cylinders
            var edge = [];

            if (type == 1) { // LinePieces
                for (var i = 0; i < geom.vertices.length; i += 2) {
                    var cylinder = this.cylinderMesh(geom.vertices[i], geom.vertices[i + 1], material, linewidth);
                    this.setCylinderScale(cylinder);
                    edge.push(cylinder);
                }
            }
            else { // LineStrip
                for (var i = 0; i < geom.vertices.length - 1; i++) {
                    var cylinder = this.cylinderMesh(geom.vertices[i], geom.vertices[i + 1], material, linewidth);
                    this.setCylinderScale(cylinder);
                    edge.push(cylinder);
                }
            }


            return edge;
        };

        // This is a workaround to deal with the limitation on linewidth on Windows due to the ANGLE library
        this.drawLineAsCylinder = function (geom, material, linewidth) {

            var line;

            if (geom.vertices.length == 2) {
                line = this.cylinderMesh(geom.vertices[0], geom.vertices[1], material, linewidth);
                this.setCylinderScale(line);
            }

            return line;
        };

        this.cylinderMesh = function (pointX, pointY, material, linewidth) {

            var direction = new THREE.Vector3().subVectors(pointY, pointX);
            var orientation = new THREE.Matrix4();
            orientation.lookAt(pointX, pointY, new THREE.Object3D().up);
            orientation.multiply(new THREE.Matrix4().set(1, 0, 0, 0,
                0, 0, 1, 0,
                0, -1, 0, 0,
                0, 0, 0, 1));

            var edgeGeometry = new THREE.CylinderGeometry(0.1 * linewidth, 0.1 * linewidth, direction.length(), 8, 1, true);
            var edge = new THREE.Mesh(edgeGeometry, material);
            edge.applyMatrix(orientation);
            edge.position.x = (pointY.x + pointX.x) / 2;
            edge.position.y = (pointY.y + pointX.y) / 2;
            edge.position.z = (pointY.z + pointX.z) / 2;

            return edge;
        };

        // Set scale for cylinder
        this.setCylinderScale = function (cylinderMesh) {

            var scale = this.setScale(cylinderMesh.position);
            cylinderMesh.scale.x = scale;
            cylinderMesh.scale.z = scale;
        };

        this.showFirstFace = function (geom, point) {

            this.showFace('first', geom, point);
        };

        this.showSecondFace = function (geom, point) {

            this.showFace('second', geom, point);
        };

        this.showFace = function (name, geom, point) {

            if (!_materialFace) {
                _materialFace = new THREE.MeshPhongMaterial({
                    color: kIndicatorColor,
                    ambient: kIndicatorColor,
                    opacity: kIndicatorOpacity,
                    transparent: true,
                    depthTest: false,
                    depthWrite: false,
                    side: THREE.DoubleSide
                }
                );

                _viewer.impl.createOverlayScene(kFaceOverlayName);
            }

            var face = _faces[name];

            if (face.mesh) {
                _viewer.impl.removeOverlay(kFaceOverlayName, face.mesh);
            }

            face.mesh = new THREE.Mesh(geom, _materialFace);
            _viewer.impl.addOverlay(kFaceOverlayName, face.mesh);

            if (_consumeSingleClick || _redraw) {

                var label = face.label;
                if (!label) {

                    label = face.label = document.createElement('div');
                    label.className = 'measure-label';
                    _viewer.container.appendChild(label);

                    label.style.pointerEvents = 'none';

                    // Stop showing area of faces per Jay's request
                    //var label_text = document.createElement('div');
                    //label_text.className = 'measure-label-text';
                    //label.appendChild(label_text);
                    var label_icon = document.createElement('div');
                    label_icon.className = 'adsk-icon-' + name + ' measure-label-icon';
                    label.appendChild(label_icon);
                }

                //label.children[0].textContent = this.getFaceArea(geom);
                label.classList.toggle('visible', true);

                face.intersectPoint = point.clone();

                this.updateLabelPositions();
            }
        };

        this.drawExtensionFace = function (geom, intersectPoint, normal) {

            if (!_materialExtensionFace) {
                _materialExtensionFace = new THREE.MeshPhongMaterial({
                    color: 0x66CCFF,
                    ambient: 0x00CCFF,
                    opacity: 0.2,
                    transparent: true,
                    depthTest: false,
                    depthWrite: false,
                    side: THREE.DoubleSide
                }
                );

                _viewer.impl.createOverlayScene(kExtensionFaceOverlayName);
            }

            var face = new THREE.Mesh(geom, _materialExtensionFace);

            face.position.set(intersectPoint.x, intersectPoint.y, intersectPoint.z);
            var V = face.position.clone();
            V.add(normal);
            face.lookAt(V);
            face.updateMatrixWorld();

            _viewer.impl.addOverlay(kExtensionFaceOverlayName, face);
        };

        this.drawGreyOutPlane = function (vpId) {

            if (!_materialGreyOutPlane) {
                _materialGreyOutPlane = new THREE.MeshPhongMaterial({
                    color: 0x000000,
                    ambient: 0x000000,
                    opacity: 0.5,
                    transparent: true,
                    depthTest: false,
                    depthWrite: false,
                    side: THREE.DoubleSide
                }
                );

                _viewer.impl.createOverlayScene(kGreyOutPlaneOverlayName);
            }

            var pw = _viewer.model.getMetadata('page_dimensions', 'page_width');
            var ph = _viewer.model.getMetadata('page_dimensions', 'page_height');

            var paperShape = new THREE.Shape();
            paperShape.moveTo(0, 0);
            paperShape.lineTo(pw, 0);
            paperShape.lineTo(pw, ph);
            paperShape.lineTo(0, ph);
            paperShape.lineTo(0, 0);

            var clip = _clip = _viewer.model.getClip(vpId);

            // TODO: Need to handle multiple contours in clip, for now we only draw the first one.
            var cntr = clip.contours[0];
            var clipPath = new THREE.Path();
            clipPath.moveTo(clip.points[cntr[0]].x, clip.points[cntr[0]].y);
            for (var i = 1; i < cntr.length; i++) {
                clipPath.lineTo(clip.points[cntr[i]].x, clip.points[cntr[i]].y);
            }
            clipPath.lineTo(clip.points[cntr[0]].x, clip.points[cntr[0]].y);

            paperShape.holes.push(clipPath);

            var paperGeom = new THREE.ShapeGeometry(paperShape);
            var paperMesh = new THREE.Mesh(paperGeom, _materialGreyOutPlane);

            _viewer.impl.addOverlay(kGreyOutPlaneOverlayName, paperMesh);
        };

        this.getEdgeLength = function (edge) {

            var length = 0;
            var eg = edge.clone();
            var vertices = eg.vertices;
            for (var i = 0; i < vertices.length; i += 2) {

                if (_viewer.model.is2d()) {
                    _viewer.model.pageToModel(vertices[i], vertices[i + 1], _firstViewportIndex);
                }

                length += vertices[i].distanceTo(vertices[i + 1]);
            }

            length = Autodesk.Viewing.Private.convertUnits(_viewer.model.getUnitString(), _units, length);

            return Autodesk.Viewing.Private.formatValueWithUnits(length, _units, 3, _precision);
        };

        this.getCircularArcRadius = function (edge) {

            var radius = edge.radius;

            if (radius) {
                if (_viewer.model.is2d()) {
                    var pt1 = edge.center.clone();
                    var pt2 = edge.vertices[0].clone();
                    _viewer.model.pageToModel(pt1, pt2, _firstViewportIndex);
                    radius = pt1.distanceTo(pt2);
                }

                radius = Autodesk.Viewing.Private.convertUnits(_viewer.model.getUnitString(), _units, radius);
                return Autodesk.Viewing.Private.formatValueWithUnits(radius, _units, 3, _precision);
            }
        };

        this.getFaceArea = function (face) {

            var area = 0;
            var vertices = face.vertices;
            var V1 = new THREE.Vector3();
            var V2 = new THREE.Vector3();

            for (var i = 0; i < vertices.length; i += 3) {

                V1.subVectors(vertices[i + 1], vertices[i]);
                V2.subVectors(vertices[i + 2], vertices[i]);

                area += V1.length() * V2.length() * Math.sin(V1.angleTo(V2)) / 2;
            }

            area = Autodesk.Viewing.Private.convertUnits(_viewer.model.getUnitString(), _units, area, 'square');

            if (_units) {

                return Autodesk.Viewing.Private.formatValueWithUnits(area, _units + '^2', 3, _precision);
            }
            else {

                return Autodesk.Viewing.Private.formatValueWithUnits(area, null, 3, _precision);
            }

        };

        this.updateLabels = function () {

            if (_firstClickGeometry === SNAP_EDGE) { // edge

                _edges['first'].label.children[0].textContent = this.getEdgeLength(_firstClick);
            }
            else if (_firstClickGeometry === SNAP_FACE) { // face

                _faces['first'].label.children[0].textContent = this.getFaceArea(_firstClick);
            }

            if (_secondClickGeometry === SNAP_EDGE) { // edge

                _edges['second'].label.children[0].textContent = this.getEdgeLength(_secondClick);
            }
            else if (_secondClickGeometry === SNAP_FACE) { // face

                _faces['second'].label.children[0].textContent = this.getFaceArea(_secondClick);
            }

        };

        this.updateLabelPositions = function () {
            //PIERRE UPDATE POSITION OF PREVIOUS MEASURES
            this.updatePrevLabelPositions();

            function project(x, y, z) {
                var camera = _viewer.navigation.getCamera(),
                    containerBounds = _viewer.navigation.getScreenViewport(),
                    p = new THREE.Vector3(x, y, z);

                p = p.project(camera);

                return {
                    x: Math.round((p.x + 1) / 2 * containerBounds.width) + 5,    // Add 5px to make the label not to be on the object
                    y: Math.round((-p.y + 1) / 2 * containerBounds.height) + 5    // Add 5px to make the label not to be on the object
                };
            }

            function placeLabelXYZ(item) {
                var p1 = item.p1,
                    p2 = item.p2,
                    p1xy = project(p1.x, p1.y, p1.z),
                    p2xy = project(p2.x, p2.y, p2.z),
                    dx = p2xy.x - p1xy.x,
                    dy = p2xy.y - p1xy.y,
                    xy = project(p2.x, p2.y, p2.z),
                    x = xy.x,
                    y = xy.y,
                    labelRect = item.label.getBoundingClientRect();

                if (0 < dy) {
                    y += kHudOffset;
                } else {
                    y -= (labelRect.height + kHudOffset);
                }
                if ((dx < 0) || (0 < dy)) {
                    x -= (labelRect.width + kHudOffset);
                } else {
                    x += kHudOffset;
                }

                return { x: x, y: y };
            }

            function placeLabelAxis(item, itemXYZ) {
                var p1 = item.p1,
                    p2 = item.p2,
                    mx = p1.x + (p2.x - p1.x) / 2,
                    my = p1.y + (p2.y - p1.y) / 2,
                    mz = p1.z + (p2.z - p1.z) / 2,
                    xy = project(mx, my, mz),
                    x = xy.x,
                    y = xy.y,
                    p1xyz = itemXYZ.p1,
                    p2xyz = itemXYZ.p2,
                    p1xy = project(p1xyz.x, p1xyz.y, p1xyz.z),
                    p2xy = project(p2xyz.x, p2xyz.y, p2xyz.z),
                    cx = (x + p1xy.x + p2xy.x) / 3,
                    cy = (y + p1xy.y + p2xy.y) / 3,
                    dx = x - cx,
                    dy = y - cy,
                    labelRect = item.label.getBoundingClientRect(),
                    halfLabelWidth = labelRect.width / 2,
                    halfLabelHeight = labelRect.height / 2;

                x -= halfLabelWidth;
                y -= halfLabelHeight;

                if (0 < dx) {
                    x += halfLabelWidth;
                } else {
                    x -= halfLabelWidth;
                }

                if (0 < dy) {
                    y += halfLabelHeight;
                } else {
                    y -= halfLabelHeight;
                }

                return { x: x, y: y };
            }

            for (var name in _lines) {
                if (_lines.hasOwnProperty(name)) {
                    var item = _lines[name],
                        label = item.label;

                    if (label) {
                        var xy = project((item.p1.x + item.p2.x) / 2, (item.p1.y + item.p2.y) / 2, (item.p1.z + item.p2.z) / 2); // TODO: avoid collisions for labels
                        label.style.top = xy.y + 'px';
                        label.style.left = xy.x + 'px';
                        _labels.push(label);
                    }
                }
            }

            if (_angleLabel) {

                label = _angleLabel.label;

                if (label) {
                    var xy = project((_angleLabel.p1.x + _angleLabel.p2.x) / 2, (_angleLabel.p1.y + _angleLabel.p2.y) / 2, (_angleLabel.p1.z + _angleLabel.p2.z) / 2); // TODO: avoid collisions for labels
                    label.style.top = xy.y + 'px';
                    label.style.left = xy.x + 'px';
                    _labels.push(label);
                }
            }

            for (var name in _faces) {
                if (_faces.hasOwnProperty(name)) {
                    var face = _faces[name],
                        label = face.label,
                        point = face.intersectPoint;

                    if (label && point) {
                        var xy = project(point.x, point.y, point.z); // TODO: avoid collisions for labels
                        label.style.top = xy.y + 'px';
                        label.style.left = xy.x + 'px';
                        _labels.push(label);
                    }
                }
            }

            for (var name in _edges) {
                if (_edges.hasOwnProperty(name)) {
                    var edge = _edges[name],
                        label = edge.label,
                        point = edge.intersectPoint;

                    if (label && point) {
                        var xy = project(point.x, point.y, point.z); // TODO: avoid collisions for labels
                        label.style.top = xy.y + 'px';
                        label.style.left = xy.x + 'px';
                        _labels.push(label);
                    }
                }
            }

            for (var name in _endPoints) {
                if (_endPoints.hasOwnProperty(name)) {
                    var endPoint = _endPoints[name],
                        label = endPoint.label,
                        point = endPoint.position;

                    if (label && point) {
                        var xy = project(point.x, point.y, point.z); // TODO: avoid collisions for labels
                        label.style.top = xy.y + 'px';
                        label.style.left = xy.x + 'px';
                        _labels.push(label);
                    }
                }
            }

            for (var i = 0; i < _labels.length; i++) {
                for (var j = 0; j < i; j++) {
                    this.labelsOverlapDetection(_labels[j], _labels[i]);
                }
            }
            _labels = [];
        };

        this.labelsOverlapDetection = function (label1, label2) {

            var rect1 = label1.getBoundingClientRect();
            var rect2 = label2.getBoundingClientRect();

            //if ((rect2.top <= rect1.bottom && rect2.top >= rect1.top) || (rect2.bottom <= rect1.bottom && rect2.bottom >= rect1.top)) {
            if (rect2.top <= rect1.bottom && rect2.bottom >= rect1.top) {
                if (rect2.right >= rect1.left && rect2.right <= rect1.right) {
                    label2.style.left = parseInt(label2.style.left, 10) - (rect2.right - rect1.left) + 'px';
                }
                else if (rect2.left >= rect1.left && rect2.left <= rect1.right) {
                    label2.style.left = parseInt(label2.style.left, 10) + (rect1.right - rect2.left) + 'px';
                }
                else if (rect2.left <= rect1.left && rect2.right >= rect1.right) {
                    label2.style.left = parseInt(label2.style.left, 10) + (rect1.right - rect2.left) + 'px';
                }
            }
        };

        // Draw distance measurement
        this.drawLine = function (p1, p2, /*optional*/ hideXYZ) {
            function updateLine(name, x1, y1, z1, x2, y2, z2, showAxis) {
                var item = _lines[name],
                    line = item.line,
                    label = item.label,
                    p1 = new THREE.Vector3(x1, y1, z1),
                    p2 = new THREE.Vector3(x2, y2, z2);

                if (line) {
                    _viewer.impl.removeOverlay('MeasureTool-' + name, line);
                    item.line = null;
                }
                if (label) {
                    label.classList.remove('visible');
                }

                if (p1.distanceTo(p2) >= Math.pow(0.1, _precision) && showAxis) {

                    var show = (name === 'xyz' || (!_simple && _consumeSingleClick));

                    if (!line) {
                        item.material = new THREE.MeshBasicMaterial({
                            color: parseInt(item.color, 16),
                            depthTest: false,
                            depthWrite: false
                        });
                        item.overlayName = 'MeasureTool-' + name;
                        _viewer.impl.createOverlayScene(item.overlayName);

                    }

                    // make the rubber band 50% transparent.
                    if (_consumeSingleClick) {
                        item.material.opacity = 1;
                    }
                    else {
                        item.material.opacity = kIndicatorOpacity;
                    }

                    _viewer.impl.clearOverlay(item.overlayName);

                    var geometry = item.geometry = new THREE.Geometry();
                    geometry.vertices.push(p1);
                    geometry.vertices.push(p2);

                    var linewidth = (name === 'xyz' ? 5 : (name === 'z' ? 1 : 2));
                    line = item.line = that.drawLineAsCylinder(geometry, item.material, linewidth);
                    _viewer.impl.addOverlay(item.overlayName, line);

                    line.visible = show;

                    item.p1 = p1;
                    item.p2 = p2;

                    if (name != 'xyz' || _consumeSingleClick) {

                        if (!label) {
                            label = item.label = document.createElement('div');
                            label.className = 'measure-length';

                            if (name === 'xyz') {
                                var text = document.createElement('div');
                                text.className = 'measure-length-text';
                                label.appendChild(text);

                                // This button is for Markup and Comments
                                //var button = document.createElement('div');
                                //button.className = 'measure-length-button';
                                //button.style.cursor = 'pointer';
                                //button.addEventListener('click', function (event) {
                                //
                                //}, true);
                                //label.appendChild(button);

                            }

                            label.style.pointerEvents = 'none';

                            if (item.axis) {
                                //label.style.color = '#' + item.color;
                                //label.style.backgroundColor = 'transparent';
                                //label.textContent = name.toUpperCase();
                                label.className = 'adsk-icon-axis-' + name + ' measure-label-axis measure-label-axis-' + name;
                            }

                            _viewer.container.appendChild(label);
                        }

                        if (!item.axis) {
                            that.updateDistance();
                        }
                        label.classList.toggle('visible', show);
                    }
                }
            }

            // If the line aligns with one of axis, then don't show axis
            function displayAxis(p1, p2) {
                var prec = Math.pow(0.1, _precision);

                if ((Math.abs(p1.x - p2.x) >= prec && Math.abs(p1.y - p2.y) < prec && Math.abs(p1.z - p2.z) < prec)
                    || (Math.abs(p1.y - p2.y) >= prec && Math.abs(p1.x - p2.x) < prec && Math.abs(p1.z - p2.z) < prec)
                    || (Math.abs(p1.z - p2.z) >= prec && Math.abs(p1.x - p2.x) < prec && Math.abs(p1.y - p2.y) < prec)) {
                    return false;
                }

                return true;
            }

            updateLine('xyz', p1.x, p1.y, p1.z, p2.x, p2.y, p2.z, true);

            var up = _viewer.navigation.getAlignedUpVector(),
                x = Math.abs(up.x),
                y = Math.abs(up.y),
                z = Math.abs(up.z);

            var showAxis = hideXYZ ? false : displayAxis(p1, p2);

            if (z > x && z > y) { // z up
                updateLine('x', p1.x, p1.y, p1.z, p2.x, p1.y, p1.z, showAxis);
                updateLine('y', p2.x, p1.y, p1.z, p2.x, p2.y, p1.z, showAxis);
                updateLine('z', p2.x, p2.y, p1.z, p2.x, p2.y, p2.z, showAxis);

            } else if (y > x && y > z) { // y up
                updateLine('x', p1.x, p1.y, p1.z, p2.x, p1.y, p1.z, showAxis);
                updateLine('z', p2.x, p1.y, p1.z, p2.x, p1.y, p2.z, showAxis);
                updateLine('y', p2.x, p1.y, p2.z, p2.x, p2.y, p2.z, showAxis);

            } else { // x up - do we ever see this?
                updateLine('y', p1.x, p1.y, p1.z, p1.x, p2.y, p1.z, showAxis);
                updateLine('z', p1.x, p2.y, p1.z, p1.x, p2.y, p2.z, showAxis);
                updateLine('x', p1.x, p2.y, p2.z, p2.x, p2.y, p2.z, showAxis);
            }

            this.updateLabelPositions();
        };

        // Update distance measurement label
        this.updateDistance = function () {
            var label = _lines.xyz.label;
            if (label) {
                label.children[0].textContent = "~ " + tool.getDistance('xyz');
            }
        };

        // Update angle measurement label
        this.updateAngle = function () {
            var label = _angleLabel.label;
            if (label) {
                label.children[0].textContent = "~ " + tool.getAngle();
            }
        };

        this.drawExtensionLine = function (point, lineStart, lineEnd) {

            var p1, p2;
            var X0 = new THREE.Vector3();
            var X1 = new THREE.Vector3();
            var nearestPoint;
            var param;

            X0.subVectors(lineStart, point);
            X1.subVectors(lineEnd, lineStart);
            param = X0.dot(X1);
            X0.subVectors(lineEnd, lineStart);
            param = -param / X0.dot(X0);

            X0.subVectors(lineEnd, lineStart);
            X0.multiplyScalar(param);
            nearestPoint = X0.add(lineStart);


            if (param < 0) {
                p1 = lineStart;
                p2 = nearestPoint;
            }
            else if (param > 1) {
                p1 = lineEnd;
                p2 = nearestPoint;
            }
            else {
                return;
            }

            if (!_materialExtensionLine) {

                _materialExtensionLine = new THREE.LineDashedMaterial({
                    color: 0x0033FF,
                    linewidth: 1,
                    dashSize: 1,
                    gapSize: 0.5,
                    depthTest: false,
                    depthWrite: false
                });

                _viewer.impl.createOverlayScene(kExtensionLineOverlayName);
            }

            // make the rubber band 50% transparent.
            if (_consumeSingleClick) {
                _materialExtensionLine.opacity = 1;
            }
            else {
                _materialExtensionLine.opacity = kIndicatorOpacity;
            }

            var dashScale = this.setScale(p1);
            _materialExtensionLine.dashSize = dashScale * 4;
            _materialExtensionLine.gapSize = dashScale * 2;

            var geometry = new THREE.Geometry();
            geometry.vertices.push(p1);
            geometry.vertices.push(p2);

            geometry.computeLineDistances();

            var line = new THREE.Line(geometry, _materialExtensionLine);
            _viewer.impl.addOverlay(kExtensionLineOverlayName, line);
        };

        this.drawExtensionLinePointToPoint = function (lineStart, lineEnd) {

            var p1 = lineStart;
            var p2 = lineEnd;

            if (!_materialExtensionLine) {

                _materialExtensionLine = new THREE.LineDashedMaterial({
                    color: 0x0033FF,
                    linewidth: 1,
                    dashSize: 1,
                    gapSize: 0.5,
                    depthTest: false,
                    depthWrite: false
                });

                _viewer.impl.createOverlayScene(kExtensionLineOverlayName);
            }

            // make the rubber band 50% transparent.
            if (_consumeSingleClick) {
                _materialExtensionLine.opacity = 1;
            }
            else {
                _materialExtensionLine.opacity = kIndicatorOpacity;
            }

            var dashScale = this.setScale(p1);
            _materialExtensionLine.dashSize = dashScale * 4;
            _materialExtensionLine.gapSize = dashScale * 2;

            var geometry = new THREE.Geometry();
            geometry.vertices.push(p1);
            geometry.vertices.push(p2);

            geometry.computeLineDistances();

            var line = new THREE.Line(geometry, _materialExtensionLine);
            _viewer.impl.addOverlay(kExtensionLineOverlayName, line);
        };

        // Get the two nearest endpoints between two line segments
        this.nearestPointsInSegmentToSegment = function (p1, p2, p3, p4) {

            var smallNum = 0.001;
            var u = new THREE.Vector3();
            var v = new THREE.Vector3();
            var w = new THREE.Vector3();

            u.subVectors(p2, p1);
            v.subVectors(p4, p3);
            w.subVectors(p1, p3);

            var a = u.dot(u);
            var b = u.dot(v);
            var c = v.dot(v);
            var d = u.dot(w);
            var e = v.dot(w);
            var D = a * c - b * b;
            var sc, sN, sD = D;
            var tc, tN, tD = D;

            // Compute the line parameters of the two closest points
            if (D < smallNum) { // the lines are almost parallel
                sN = 0.0;  // for using point p1 on segment p1p2
                sD = 1.0;  // to prevent possible division by 0.0 later
                tN = e;
                tD = c;
            }
            else {  // get the closest points on the infinite lines
                sN = b * e - c * d;
                tN = a * e - b * d;
                if (sN < 0.0) {  // sc < 0 => the s = 0 is visible
                    sN = 0.0;
                    tN = e;
                    tD = c;
                }
                else if (sN > sD) {  // sc > 1 => the s = 1 edge is visible
                    sN = sD;
                    tN = e + b;
                    tD = c;
                }
            }

            if (tN < 0.0) {  // tc < 0 => the t = 0 edge is visible
                tN = 0.0;
                // recompute sc for this edge
                if (-d < 0.0)
                    sN = 0.0;
                else if (-d > a)
                    sN = sD;
                else {
                    sN = -d;
                    sD = a;
                }
            }
            else if (tN > tD) {  // tc > 1 => the t = 1 edge is visible
                tN = tD;
                // recompute sc for this edge
                if ((-d + b) < 0.0)
                    sN = 0;
                else if ((-d + b) > a)
                    sN = sD;
                else {
                    sN = -d + b;
                    sD = a;
                }
            }

            // finally do the division to get sc and tc
            sc = Math.abs(sN) < smallNum ? 0.0 : sN / sD;
            tc = Math.abs(tN) < smallNum ? 0.0 : tN / tD;

            // get the difference of the two closest points
            u.multiplyScalar(sc);
            v.multiplyScalar(tc);
            w.add(u);
            w.sub(v);

            //return w.length();

            u.add(p1);
            v.add(p3);
            return [u, v];
        };

        // Measure from Edge to Edge
        this.edgeToEdgeMeasure = function (edge1, edge2, intersectPoint) {

            var smallNum = 0.01;

            var eps = _snapper.getEndPointsInEdge(edge1);
            var p1 = eps[0].clone();
            var p2 = eps[1].clone();
            eps = _snapper.getEndPointsInEdge(edge2);
            var p3 = eps[0].clone();
            var p4 = eps[1].clone();

            var va = this.nearestPointInPointToLine(p1, p3, p4);
            var vb = this.nearestPointInPointToLine(p2, p3, p4);

            var v1 = new THREE.Vector3();
            var v2 = new THREE.Vector3();

            v1.subVectors(p1, p2);
            v2.subVectors(p3, p4);
            v1.normalize();
            v2.normalize();

            // Draw distance line between parallel edges
            if (this.isEqualVectors(v1, v2, smallNum) || this.isInverseVectors(v1, v2, smallNum)) {

                // Measure the endpoint closest to the intersection point
                if (p1.distanceTo(intersectPoint) <= p2.distanceTo(intersectPoint)) {

                    this.drawLine(p1, va);
                    this.drawExtensionLine(p1, p3, p4);
                    return [p1, va];
                }
                else {

                    this.drawLine(p2, vb);
                    this.drawExtensionLine(p2, p3, p4);
                    return [p2, vb];
                }
            }
            else {  // Draw arc

                // Find the nearest point on the edge to the intersectPoint, make this point as the new endpoint of the edge,
                // because we don't want to draw the arc so big, this is consistent with Fusion
                var newEp = this.nearestPointInPointToLine(intersectPoint, p1, p2);

                var angle = this.angleVectorToVector(v1, v2);

                // Find the nearest endpoints of the two edges
                // Draw arc between p1p2 and p3p4
                if (p1.distanceTo(p3) < p1.distanceTo(p4) && p1.distanceTo(p3) < p2.distanceTo(p3) && p1.distanceTo(p3) < p2.distanceTo(p4)) {

                    this.drawAngleLineToLine(p1, newEp, p3, p4, angle);
                }
                    // Draw arc between p1p2 and p4p3
                else if (p1.distanceTo(p4) < p1.distanceTo(p3) && p1.distanceTo(p4) < p2.distanceTo(p3) && p1.distanceTo(p4) < p2.distanceTo(p4)) {

                    this.drawAngleLineToLine(p1, newEp, p4, p3, angle);
                }
                    // Draw arc between p2p1 and p3p4
                else if (p2.distanceTo(p3) < p1.distanceTo(p3) && p2.distanceTo(p3) < p1.distanceTo(p4) && p2.distanceTo(p3) < p2.distanceTo(p4)) {

                    this.drawAngleLineToLine(p2, newEp, p3, p4, angle);
                }
                    // Draw arc between p2p1 and p4p3
                else {  // if (p2.distanceTo(p4) < p1.distanceTo(p3) && p2.distanceTo(p4) < p1.distanceTo(p4) && p2.distanceTo(p4) < p2.distanceTo(p3)) {

                    this.drawAngleLineToLine(p2, newEp, p4, p3, angle);
                }

                return angle;
            }

        };

        // Measure between Curved Edge and Straight Edge
        this.curvedEdgeToEdgeMeasure = function (curvedEdge, edge) {

            var minDist = Number.MAX_VALUE;
            var nP1 = null;
            var nP2 = null;

            var vertices = curvedEdge.vertices;
            var eps = _snapper.getEndPointsInEdge(edge);

            for (var i = 0; i < vertices.length; i += 2) {
                var tempPs = this.nearestPointsInSegmentToSegment(vertices[i], vertices[i + 1], eps[0], eps[1]);
                var dist = tempPs[0].distanceTo(tempPs[1]);
                if (dist < minDist) {
                    minDist = dist;
                    nP1 = tempPs[0];
                    nP2 = tempPs[1];
                }
            }

            this.drawLine(nP1, nP2);

            return [nP1, nP2];
        };

        // Measure between Curved Edge and Curved Edge
        this.curvedEdgeToCurvedEdgeMeasure = function (edge1, edge2) {

            var minDist = Number.MAX_VALUE;
            var nP1 = null;
            var nP2 = null;

            var vertices1 = edge1.vertices;
            var vertices2 = edge2.vertices;

            for (var i = 0; i < vertices1.length; i += 2)
                for (var j = 0; j < vertices2.length; j += 2) {
                    var tempPs = this.nearestPointsInSegmentToSegment(vertices1[i], vertices1[i + 1], vertices2[j], vertices2[j + 1]);
                    var dist = tempPs[0].distanceTo(tempPs[1]);
                    if (dist < minDist) {
                        minDist = dist;
                        nP1 = tempPs[0];
                        nP2 = tempPs[1];
                    }
                }

            this.drawLine(nP1, nP2);

            return [nP1, nP2];
        };

        // Get the nearest point on the line segment from point to line segment
        this.nearestPointInPointToSegment = function (point, lineStart, lineEnd) {

            var X0 = new THREE.Vector3();
            var X1 = new THREE.Vector3();
            var nearestPoint;
            var param;

            X0.subVectors(lineStart, point);
            X1.subVectors(lineEnd, lineStart);
            param = X0.dot(X1);
            X0.subVectors(lineEnd, lineStart);
            param = -param / X0.dot(X0);

            if (param < 0) {
                nearestPoint = lineStart;
            }
            else if (param > 1) {
                nearestPoint = lineEnd;
            }
            else {
                X0.subVectors(lineEnd, lineStart);
                X0.multiplyScalar(param);
                nearestPoint = X0.add(lineStart);
            }

            return nearestPoint;
        };

        // Get the nearest point on the line from point to line
        this.nearestPointInPointToLine = function (point, lineStart, lineEnd) {

            var X0 = new THREE.Vector3();
            var X1 = new THREE.Vector3();
            var nearestPoint;
            var param;

            X0.subVectors(lineStart, point);
            X1.subVectors(lineEnd, lineStart);
            param = X0.dot(X1);
            X0.subVectors(lineEnd, lineStart);
            param = -param / X0.dot(X0);

            X0.subVectors(lineEnd, lineStart);
            X0.multiplyScalar(param);
            nearestPoint = X0.add(lineStart);

            return nearestPoint;
        };

        // Measure from Point to Edge
        this.pointToEdgeMeasure = function (point, edge, intersectPoint) {

            var eps = _snapper.getEndPointsInEdge(edge);

            var lineStart = eps[0];
            var lineEnd = eps[1];

            var X0 = this.nearestPointInPointToLine(point, lineStart, lineEnd);
            var X1 = this.nearestPointInPointToLine(intersectPoint, lineStart, lineEnd);

            var p1 = new THREE.Vector3();
            p1.subVectors(X1, X0);
            p1.add(point);

            this.drawLine(p1, X1);

            this.drawExtensionLinePointToPoint(point, p1);

            return [point, X0];
        };

        // Measure from Edge to Point
        this.edgeToPointMeasure = function (edge, point) {

            var eps = _snapper.getEndPointsInEdge(edge);

            var lineStart = eps[0];
            var lineEnd = eps[1];

            var X0 = this.nearestPointInPointToLine(point, lineStart, lineEnd);

            this.drawLine(point, X0);

            this.drawExtensionLine(point, lineStart, lineEnd);

            return [point, X0];
        };

        // Measure between Curved Edge and Vertex
        this.curvedEdgeToVertexMeasure = function (edge, point) {

            var vertices = edge.vertices;
            var minDist = Number.MAX_VALUE;
            var nearestPoint = null;

            for (var i = 0; i < vertices.length; i += 2) {

                var nP = this.nearestPointInPointToSegment(point, vertices[i], vertices[i + 1]);
                var dist = point.distanceTo(nP);
                if (dist < minDist) {
                    minDist = dist;
                    nearestPoint = nP;
                }
            }

            this.drawLine(point, nearestPoint);

            return [point, nearestPoint];
        };

        // Measure from Face to Face
        this.faceToFaceMeasure = function (p1, n1, p2, n2) {

            var smallNum = 0.01;
            var firstNormal = n1.clone();
            var secondNormal = n2.clone();

            var angle = this.angleVectorToVector(n1, n2);

            if (((firstNormal.x <= secondNormal.x + smallNum) && (firstNormal.x >= secondNormal.x - smallNum)
                && (firstNormal.y <= secondNormal.y + smallNum) && (firstNormal.y >= secondNormal.y - smallNum)
                && (firstNormal.z <= secondNormal.z + smallNum) && (firstNormal.z >= secondNormal.z - smallNum))
                || ((firstNormal.x <= -secondNormal.x + smallNum) && (firstNormal.x >= -secondNormal.x - smallNum)
                && (firstNormal.y <= -secondNormal.y + smallNum) && (firstNormal.y >= -secondNormal.y - smallNum)
                && (firstNormal.z <= -secondNormal.z + smallNum) && (firstNormal.z >= -secondNormal.z - smallNum))) {
                var X0 = new THREE.Vector3();
                X0.subVectors(p1, p2);
                var t = firstNormal.dot(X0) / firstNormal.dot(secondNormal);

                X0.addVectors(p2, secondNormal.multiplyScalar(t));

                //var dist = new THREE.Vector3();
                //dist.subVectors(X0, p1);
                //var extendFace = _faces['first'].mesh.geometry.clone();
                //extendFace.applyMatrix(new THREE.Matrix4().makeTranslation(dist.x, dist.y, dist.z));

                var dist = X0.distanceTo(p1) * 2;
                var extendFace = new THREE.PlaneBufferGeometry(dist, dist);
                this.drawExtensionFace(extendFace, p1, n1);
                //this.drawExtensionLinePointToPoint(p1, X0);

                this.drawLine(p2, X0, true);
                return [p2, X0, angle];
            }
            else {

                //this.drawLine(p1, p2);
                //return [p1, p2, angle];

                angle = this.drawAngleFaceToFace(p1, n1, p2, n2);
                return angle;
            }
        };

        this.angleVectorToVector = function (v1, v2) {

            var a = v1.angleTo(v2) * 180 / Math.PI;
            return a;
        };

        // Find the intersection of two nonparallel planes
        this.intersectPlaneToPlane = function (p1, n1, p2, n2) {

            var u = new THREE.Vector3();
            u.crossVectors(n1, n2);
            var ax = (u.x >= 0 ? u.x : -u.x);
            var ay = (u.y >= 0 ? u.y : -u.y);
            var az = (u.z >= 0 ? u.z : -u.z);

            var maxc;  // max coordinate
            if (ax > ay) {
                if (ax > az)
                    maxc = 1;
                else
                    maxc = 3;
            }
            else {
                if (ay > az)
                    maxc = 2;
                else maxc = 3;
            }

            var iP = new THREE.Vector3(); // intersect point
            var d1, d2;
            d1 = -n1.dot(p1);
            d2 = -n2.dot(p2);

            switch (maxc) {

                case 1:  // intersect with x = 0
                    iP.x = 0;
                    if (u.x !== 0) {
                        iP.y = (d2 * n1.z - d1 * n2.z) / u.x;
                        iP.z = (d1 * n2.y - d2 * n1.y) / u.x;
                    }
                    else {
                        iP.y = -(d2 * n1.z) / (n1.z * n2.y);
                        iP.z = -(d1 * n2.y) / (n1.z * n2.y);
                    }
                    break;
                case 2:
                    iP.y = 0;
                    if (u.y !== 0) {
                        iP.x = (d1 * n2.z - d2 * n1.z) / u.y;
                        iP.z = (d2 * n1.x - d1 * n2.x) / u.y;
                    }
                    else {
                        iP.x = -(d1 * n2.z) / (n1.x * n2.z);
                        iP.z = -(d2 * n1.x) / (n1.x * n2.z);
                    }
                    break;
                case 3:
                    iP.z = 0;
                    if (u.z !== 0) {
                        iP.x = (d2 * n1.y - d1 * n2.y) / u.z;
                        iP.y = (d1 * n2.x - d2 * n1.x) / u.z;
                    }
                    else {
                        iP.x = -(d2 * n1.y) / (n1.y * n2.x);
                        iP.y = -(d1 * n2.x) / (n1.y * n2.x);
                    }
                    break;
            }

            var iP2 = new THREE.Vector3();
            iP2.addVectors(iP, u.multiplyScalar(100));

            var vP1 = this.nearestPointInPointToLine(p1, iP, iP2);
            var vP2 = this.nearestPointInPointToLine(p2, iP, iP2);

            return [vP1, vP2];

        };

        this.drawAngle = function (p, ep1, ep2, n, angle, midPoint) {

            var smallNum = 0.001;

            if (!_materialAngle) {

                _materialAngle = new THREE.MeshPhongMaterial({
                    color: 0x999999,
                    ambient: 0x999999,
                    opacity: 0.5,
                    transparent: true,
                    depthTest: false,
                    depthWrite: false,
                    side: THREE.DoubleSide
                }
                );

                _materialAngleOutline = new THREE.MeshBasicMaterial({
                    color: 0xFF9900,
                    depthTest: false,
                    depthWrite: false
                });

                _viewer.impl.createOverlayScene(kAngleOverlayName, _materialAngle);
                _viewer.impl.createOverlayScene(kAngleOutlineOverlayName, _materialAngleOutline);
            }

            _viewer.impl.clearOverlay(kAngleOverlayName);
            _viewer.impl.clearOverlay(kAngleOutlineOverlayName);


            // draw arc of angle
            var radius = p.distanceTo(ep1);
            var segments = 100;
            //angle = angle * Math.PI / 180;

            var circleGeometry = new THREE.CircleGeometry(radius, segments, 0, angle * Math.PI / 180);
            var arc = new THREE.Mesh(circleGeometry, _materialAngle);

            var center = arc.geometry.vertices[0].clone();
            arc.geometry.vertices.push(center);


            // Translate and rotate the arc to the plane where it should lie in
            arc.position.set(p.x, p.y, p.z);
            var V = arc.position.clone();
            V.add(n);
            arc.lookAt(V);
            arc.updateMatrixWorld();


            // Rotate the arc in the plane to the right place
            var vA = arc.geometry.vertices[1].clone();
            var vB = arc.geometry.vertices[arc.geometry.vertices.length - 2].clone();
            vA.applyMatrix4(arc.matrixWorld);
            vB.applyMatrix4(arc.matrixWorld);

            var v1 = new THREE.Vector3();
            var v2 = new THREE.Vector3();
            var v3 = new THREE.Vector3();
            var v4 = new THREE.Vector3();
            v1.subVectors(vA, p);
            v2.subVectors(vB, p);
            v3.subVectors(ep1, p);
            v4.subVectors(ep2, p);

            var a13 = v1.angleTo(v3);
            var a14 = v1.angleTo(v4);
            var a23 = v2.angleTo(v3);
            var a24 = v2.angleTo(v4);

            //console.log(a13 * 180 / Math.PI + " " + a14 * 180 / Math.PI + " " + a23 * 180 / Math.PI + " " + a24 * 180 / Math.PI);

            var ra;
            // The arc is in the right place
            if (((a13 <= smallNum && a13 >= -smallNum) || (a14 <= smallNum && a14 >= -smallNum))
                && ((a23 <= smallNum && a23 >= -smallNum) || (a24 <= smallNum && a24 >= -smallNum))) {

                ra = 0;
            }
                // The arc needs to be rotated 180 degree to the right place
            else if (((a13 <= Math.PI + smallNum && a13 >= Math.PI - smallNum) || (a14 <= Math.PI + smallNum && a14 >= Math.PI - smallNum))
                && ((a23 <= Math.PI + smallNum && a23 >= Math.PI - smallNum) || (a24 <= Math.PI + smallNum && a24 >= Math.PI - smallNum))) {

                ra = Math.PI;
            }
                // The arc needs to be rotated a13 radian
            else if ((a13 <= a23 + smallNum && a13 >= a23 - smallNum) || (a13 <= a24 + smallNum && a13 >= a24 - smallNum)) {

                ra = a13;
            }
                // The arc needs to be rotated a14 radian
            else {

                ra = a14;
            }

            var rotWorldMatrix = new THREE.Matrix4();
            rotWorldMatrix.makeRotationAxis(n, ra);
            //arc.matrix.multiply(rotWorldMatrix);
            rotWorldMatrix.multiply(arc.matrix);
            arc.matrix = rotWorldMatrix;
            arc.rotation.setFromRotationMatrix(arc.matrix);

            // Check if rotate to the wrong direction, if so, rotate back twice of the degree
            arc.updateMatrixWorld();
            vA = arc.geometry.vertices[1].clone();
            vB = arc.geometry.vertices[arc.geometry.vertices.length - 2].clone();
            vA.applyMatrix4(arc.matrixWorld);
            vB.applyMatrix4(arc.matrixWorld);

            v1.subVectors(vA, p);
            v2.subVectors(vB, p);

            a13 = v1.angleTo(v3);
            a14 = v1.angleTo(v4);
            a23 = v2.angleTo(v3);
            a24 = v2.angleTo(v4);

            //console.log(a13 * 180 / Math.PI + " " + a14 * 180 / Math.PI + " " + a23 * 180 / Math.PI + " " + a24 * 180 / Math.PI);

            if (a13 >= smallNum && a14 >= smallNum) {

                var rotWorldMatrix = new THREE.Matrix4();
                rotWorldMatrix.makeRotationAxis(n, -ra * 2);
                //arc.matrix.multiply(rotWorldMatrix);
                rotWorldMatrix.multiply(arc.matrix);
                arc.matrix = rotWorldMatrix;
                arc.rotation.setFromRotationMatrix(arc.matrix);
            }

            // draw outline of the arc
            var outlineGeometry = new THREE.CircleGeometry(radius * 0.9, segments, 0, angle * Math.PI / 180);
            outlineGeometry.vertices.splice(0, 1);
            arc.updateMatrixWorld();
            outlineGeometry.applyMatrix(arc.matrixWorld);
            var outline = this.drawEdgeAsCylinder(outlineGeometry, _materialAngleOutline, 2.5, 0);


            // draw lines of angle
            var geom1 = new THREE.Geometry();
            var geom2 = new THREE.Geometry();
            geom1.vertices.push(arc.geometry.vertices[0].clone(), arc.geometry.vertices[1].clone());
            geom2.vertices.push(arc.geometry.vertices[0].clone(), arc.geometry.vertices[arc.geometry.vertices.length - 2].clone());
            geom1.applyMatrix(arc.matrixWorld);
            geom2.applyMatrix(arc.matrixWorld);
            var line1 = this.drawLineAsCylinder(geom1, _materialAngleOutline, 2.5);
            var line2 = this.drawLineAsCylinder(geom2, _materialAngleOutline, 2.5);


            _viewer.impl.addOverlay(kAngleOverlayName, arc);
            _viewer.impl.addMultipleOverlays(kAngleOutlineOverlayName, outline);
            _viewer.impl.addOverlay(kAngleOutlineOverlayName, line1);
            _viewer.impl.addOverlay(kAngleOutlineOverlayName, line2);

            // This is used for angle label's position
            midPoint.copy(arc.geometry.vertices[Math.round(arc.geometry.vertices.length / 2) - 1]);
            midPoint.applyMatrix4(arc.matrixWorld);
        };

        // Draw angle between face to face
        this.drawAngleFaceToFace = function (p1, n1, p2, n2) {

            var vPs = this.intersectPlaneToPlane(p1, n1, p2, n2);

            var X1 = new THREE.Vector3();
            var X2 = new THREE.Vector3();
            X1.subVectors(p1, vPs[0]);
            X2.subVectors(p2, vPs[1]);

            var angle = this.angleVectorToVector(X1, X2);

            var p = vPs[0].clone();
            var n = new THREE.Vector3();
            n.crossVectors(n1, n2);
            n.normalize();

            vPs = this.intersectPlaneToPlane(p1, n1, p, n);
            var ep1 = vPs[0].clone();
            vPs = this.intersectPlaneToPlane(p2, n2, p, n);
            var ep2 = vPs[0].clone();

            var midPoint = new THREE.Vector3();

            this.drawAngle(p, ep1, ep2, n, angle, midPoint);

            if (_consumeSingleClick) {

                var label = _angleLabel.label;
                if (!label) {

                    label = _angleLabel.label = document.createElement('div');
                    label.className = 'measure-length';
                    _viewer.container.appendChild(label);

                    var text = document.createElement('div');
                    text.className = 'measure-length-text';
                    label.appendChild(text);

                    label.style.pointerEvents = 'none';

                    // This button is for Markup and Comments
                    //var button = document.createElement('div');
                    //button.className = 'measure-length-button';
                    //button.style.cursor = 'pointer';
                    //button.addEventListener('click', function (event) {
                    //
                    //}, true);
                    //label.appendChild(button);
                }

                label.children[0].textContent = tool.getAngle();
                label.classList.toggle('visible', true);

                _angleLabel.p1 = midPoint.clone();
                _angleLabel.p2 = midPoint.clone();

                this.updateLabelPositions();
            }

            return angle;
        };

        // Draw angle between line to line
        this.drawAngleLineToLine = function (p1, p2, p3, p4, angle) {

            var p = p1;
            var n = new THREE.Vector3();
            var n1 = new THREE.Vector3();
            var n2 = new THREE.Vector3();
            n1.subVectors(p1, p2);
            n2.subVectors(p3, p4);
            n.crossVectors(n1, n2);
            n.normalize();


            var ep1 = p2;
            var ep2 = new THREE.Vector3();
            ep2.subVectors(p, p3);
            ep2.add(p4);

            var midPoint = new THREE.Vector3();

            this.drawAngle(p, ep1, ep2, n, angle, midPoint);

            if (_consumeSingleClick) {

                var label = _angleLabel.label;
                if (!label) {

                    label = _angleLabel.label = document.createElement('div');
                    label.className = 'measure-length';
                    _viewer.container.appendChild(label);

                    var text = document.createElement('div');
                    text.className = 'measure-length-text';
                    label.appendChild(text);

                    label.style.pointerEvents = 'none';

                    // This button is for Markup and Comments
                    //var button = document.createElement('div');
                    //button.className = 'measure-length-button';
                    //button.style.cursor = 'pointer';
                    //button.addEventListener('click', function (event) {
                    //
                    //}, true);
                    //label.appendChild(button);
                }

                label.children[0].textContent = tool.getAngle();
                label.classList.toggle('visible', true);

                _angleLabel.p1 = midPoint.clone();
                _angleLabel.p2 = midPoint.clone();

                this.updateLabelPositions();
            }
        };

        // Find the intersection point of two nonparallel lines
        this.intersectLineToLine = function (p1, v1, p2, v2) {

            var X0 = new THREE.Vector3();
            var X1 = new THREE.Vector3();

            X0.subVectors(p2, p1);
            X0.cross(v2);
            X1.crossVectors(v1, v2);

            var scalar = X0.divide(X1);

            X1 = v1.clone();
            X1.multiplyScalar(scalar);
            X0.addVectors(p1, X1);

            return X0;
        };

        // Find the nearest point from point to plane
        this.nearestPointInPointToPlane = function (p1, p2, n) {

            var nearestPoint = new THREE.Vector3();
            var norm = n.clone();
            var X0 = new THREE.Vector3();
            X0.subVectors(p1, p2);

            var sn = -norm.dot(X0);
            var sd = norm.dot(norm);
            var sb = sn / sd;

            nearestPoint.addVectors(p1, norm.multiplyScalar(sb));
            return nearestPoint;
        };

        // Measure from face to vertex
        this.faceToPointMeasure = function (face, normal, intersectPoint, point) {

            var p = face.vertices[0];

            var X0 = this.nearestPointInPointToPlane(point, p, normal);

            var p1 = intersectPoint.clone();
            var p2 = new THREE.Vector3();
            p2.subVectors(p1, X0);
            p2.add(point);

            //var dist = new THREE.Vector3();
            //dist.subVectors(X0, p1);
            //var extendFace = face.clone();
            //extendFace.applyMatrix(new THREE.Matrix4().makeTranslation(dist.x, dist.y, dist.z));

            var dist = X0.distanceTo(intersectPoint) * 2;
            var extendFace = new THREE.PlaneBufferGeometry(dist, dist);
            this.drawExtensionFace(extendFace, intersectPoint, normal);

            this.drawLine(point, X0);
            //this.drawExtensionLinePointToPoint(p1, X0);
            return [point, X0];
        };

        // Find the nearest point from point to triangle
        this.nearestPointInPointToTriangle = function (point, a, b, c) {

            var nearestPoint;
            var minDist = Number.MAX_VALUE;

            nearestPoint = this.pointProjectsInTriangle(point, a, b, c);
            if (nearestPoint) {
                return nearestPoint;
            }

            var p = this.nearestPointInPointToSegment(point, a, b);
            if (point.distanceTo(p) < minDist) {
                minDist = point.distanceTo(p);
                nearestPoint = p.clone();
            }

            p = this.nearestPointInPointToSegment(point, a, c);
            if (point.distanceTo(p) < minDist) {
                minDist = point.distanceTo(p);
                nearestPoint = p.clone();
            }

            p = this.nearestPointInPointToSegment(point, b, c);
            if (point.distanceTo(p) < minDist) {

                nearestPoint = p.clone();
            }

            return nearestPoint;
        };

        // Measure from point to face
        this.pointToFaceMeasure = function (point, face, normal, intersectPoint) {

            var p = face.vertices[0];

            var X0 = this.nearestPointInPointToPlane(point, p, normal);

            var p1 = intersectPoint.clone();
            var p2 = new THREE.Vector3();
            p2.subVectors(p1, X0);
            p2.add(point);

            this.drawLine(p1, p2);
            this.drawExtensionLinePointToPoint(point, p2);
            return [point, X0];

        };

        // Measure between Curved Face and Vertex
        this.curvedFaceToVertexMeasure = function (face, point) {

            var minDist = Number.MAX_VALUE;
            var nearestPoint;
            var vertices = face.vertices;

            for (var i = 0; i < vertices.length; i += 3) {
                var tempP = this.nearestPointInPointToTriangle(point, vertices[i], vertices[i + 1], vertices[i + 2]);
                if (point.distanceTo(tempP) < minDist) {
                    minDist = point.distanceTo(tempP);
                    nearestPoint = tempP;
                }
            }

            this.drawLine(nearestPoint, point);

            return [nearestPoint, point];
        };

        this.pointProjectsInTriangle = function (point, a, b, c) {

            var u = new THREE.Vector3();
            var v = new THREE.Vector3();
            var w = new THREE.Vector3();
            var n = new THREE.Vector3();

            u.subVectors(b, a);
            v.subVectors(c, a);
            n.crossVectors(u, v);
            w.subVectors(point, a);

            u.cross(w);
            var r = u.dot(n) / n.dot(n);
            w.cross(v);
            var b = w.dot(n) / n.dot(n);
            var a = 1 - r - b;

            if (a >= 0 && a <= 1 && b >= 0 && b <= 1 && r >= 0 && r <= 1) {

                var normal = THREE.Triangle.normal(a, b, c);
                var nearestPoint = this.nearestPointInPointToPlane(point, a, normal);

                return nearestPoint;
            }
        };

        this.nearestPointsInLineSegmentToTriangle = function (p1, p2, a, b, c) {

            // The closest pair of points between a line segment and a triangle can always be found either
            // (a) between an endpoint of the segment an the triangle interior or
            // (b) between the segment and an edge of the triangle.

            var nearestPoints = [];
            var minDist = Number.MAX_VALUE;

            var p3, p4;

            var pp1 = this.pointProjectsInTriangle(p1, a, b, c);
            if (pp1 && p1.distanceTo(pp1) < minDist) {
                minDist = p1.distanceTo(pp1);
                nearestPoints[0] = p1;
                nearestPoints[1] = pp1;
            }

            var pp2 = this.pointProjectsInTriangle(p2, a, b, c);
            if (pp2 && p2.distanceTo(pp2) < minDist) {
                minDist = p2.distanceTo(pp2);
                nearestPoints[0] = p2;
                nearestPoints[1] = pp2;
            }

            p3 = a;
            p4 = b;
            var p = this.nearestPointsInSegmentToSegment(p1, p2, p3, p4);
            if (p[0].distanceTo(p[1]) < minDist) {
                minDist = p[0].distanceTo(p[1]);
                nearestPoints[0] = p[0].clone();
                nearestPoints[1] = p[1].clone();
            }

            p3 = a;
            p4 = c;
            p = this.nearestPointsInSegmentToSegment(p1, p2, p3, p4);
            if (p[0].distanceTo(p[1]) < minDist) {
                minDist = p[0].distanceTo(p[1]);
                nearestPoints[0] = p[0].clone();
                nearestPoints[1] = p[1].clone();
            }

            p3 = b;
            p4 = c;
            p = this.nearestPointsInSegmentToSegment(p1, p2, p3, p4);
            if (p[0].distanceTo(p[1]) < minDist) {

                nearestPoints[0] = p[0].clone();
                nearestPoints[1] = p[1].clone();
            }

            return nearestPoints;
        };

        // Find the two nearest points between edge and face
        this.nearestPointsInEdgeToFace = function (p1, p2, face) {

            var nearestPoints = [];
            var minDist = Number.MAX_VALUE;

            for (var i = 0; i < face.vertices.length; i += 3) {

                var tempPs = this.nearestPointsInLineSegmentToTriangle(p1, p2, face.vertices[i], face.vertices[i + 1], face.vertices[i + 2]);
                if (tempPs[0].distanceTo(tempPs[1]) < minDist) {
                    minDist = tempPs[0].distanceTo(tempPs[1]);
                    nearestPoints = tempPs;
                }
            }

            return nearestPoints;
        };

        // Find the two nearest points between triangle and triangle
        this.nearestPointsInTriangleToTriangle = function (a1, b1, c1, a2, b2, c2) {

            // A pair of closest points between two triangles can be found by computing the closest points between
            // segment and triangle for all six possible combinations of an edge from one triangle tested against
            // the other triangle. But segment-triangle distance tests are fairly expensive,  and thus a better
            // realization is that the closest pair of points between T1 and T2 can be found to occur either on
            // an edge from each triangle or as a vertex of one triangle and a point interior to the other triangle.
            // In all, six vertex-triangle tests and nine edge-edge tests are required.

            var self = this;
            var nearestPoints = [];
            var minDist = Number.MAX_VALUE;

            function vertexToTriangleTest(point, a, b, c) {

                var p = self.pointProjectsInTriangle(point, a, b, c);
                if (p && point.distanceTo(p) < minDist) {
                    minDist = point.distanceTo(p);
                    nearestPoints[0] = point;
                    nearestPoints[1] = p;
                }
            }

            function edgeToEdgeTest(p1, p2, p3, p4) {

                var p = self.nearestPointsInSegmentToSegment(p1, p2, p3, p4);
                if (p[0].distanceTo(p[1]) < minDist) {
                    minDist = p[0].distanceTo(p[1]);
                    nearestPoints = p;
                }
            }

            // a1
            vertexToTriangleTest(a1, a2, b2, c2);

            // b1
            vertexToTriangleTest(b1, a2, b2, c2);

            // c1
            vertexToTriangleTest(c1, a2, b2, c2);

            // a2
            vertexToTriangleTest(a2, a1, b1, c1);

            // b2
            vertexToTriangleTest(b2, a1, b1, c1);

            // c2
            vertexToTriangleTest(c2, a1, b1, c1);

            // edge a1b1 and a2b2
            edgeToEdgeTest(a1, b1, a2, b2);

            // edge a1b1 and a2c2
            edgeToEdgeTest(a1, b1, a2, c2);

            // edge a1b1 and b2c2
            edgeToEdgeTest(a1, b1, b2, c2);

            // edge a1c1 and a2b2
            edgeToEdgeTest(a1, c1, a2, b2);

            // edge a1c1 and a2c2
            edgeToEdgeTest(a1, c1, a2, c2);

            // edge a1c1 and b2c2
            edgeToEdgeTest(a1, c1, b2, c2);

            // edge b1c1 and a2b2
            edgeToEdgeTest(b1, c1, a2, b2);

            // edge b1c1 and a2c2
            edgeToEdgeTest(b1, c1, a2, c2);

            // edge b1c1 and b2c2
            edgeToEdgeTest(b1, c1, b2, c2);

            return nearestPoints;
        };

        // Measure between Edge and Face when one of them or both are Curved
        this.curvedEdgeToFaceMeasure = function (edge, face) {

            var minDist = Number.MAX_VALUE;
            var nearestPoints = [];
            var vertices = edge.vertices;

            for (var i = 0; i < vertices.length; i += 2) {

                var tempPs = this.nearestPointsInEdgeToFace(vertices[i], vertices[i + 1], face);
                if (tempPs[0].distanceTo(tempPs[1]) < minDist) {
                    minDist = tempPs[0].distanceTo(tempPs[1]);
                    nearestPoints = tempPs;
                }
            }

            this.drawLine(nearestPoints[0], nearestPoints[1]);

            return [nearestPoints[0], nearestPoints[1]];
        };

        // Measure between Curved Face and Face/Curved Face
        this.curvedFaceToFaceMeasure = function (face1, face2) {

            var minDist = Number.MAX_VALUE;
            var nearestPoints = [];

            var v1s = face1.vertices;
            var v2s = face2.vertices;

            face1.computeBoundingSphere();
            face2.computeBoundingSphere();
            var bSphere1 = new THREE.Sphere();
            var bSphere2 = new THREE.Sphere();
            var mins = [];
            var minMax = Number.MAX_VALUE;
            var minV1s = [];
            var minV2s = [];
            face1.bSpheres = [];
            face2.bSpheres = [];

            // Find the smallest max between face2's bounding sphere and face1's triangles' bounding spheres
            for (var i = 0; i < v1s.length; i += 3) {

                bSphere1.setFromPoints([v1s[i], v1s[i + 1], v1s[i + 2]]);
                face1.bSpheres.push(bSphere1.clone());
                var max = bSphere1.center.distanceTo(face2.boundingSphere.center) + bSphere1.radius + face2.boundingSphere.radius;

                if (max < minMax) {
                    minMax = max;
                }
            }

            // Get rid of the triangles whose min is bigger than smallest max in face1
            for (var i = 0; i < v1s.length; i += 3) {

                bSphere1 = face1.bSpheres[i / 3];
                var min = bSphere1.center.distanceTo(face2.boundingSphere.center) - bSphere1.radius - face2.boundingSphere.radius;

                if (min <= minMax) {
                    minV1s.push(i);
                }
            }

            // Find the smallest max between face1's bounding sphere and face2's triangles' bounding spheres
            minMax = Number.MAX_VALUE;
            for (var j = 0; j < v2s.length; j += 3) {

                bSphere2.setFromPoints(v2s[j], v2s[j + 1], v2s[j + 2]);
                face2.bSpheres.push(bSphere2.clone());
                var max = bSphere2.center.distanceTo(face1.boundingSphere.center) + bSphere2.radius + face1.boundingSphere.radius;

                if (max < minMax) {
                    minMax = max;
                }
            }

            // Get rid of the triangles whose min is bigger than smallest max in face2
            for (var j = 0; j < v2s.length; j += 3) {

                bSphere2 = face2.bSpheres[j / 3];
                var min = bSphere2.center.distanceTo(face1.boundingSphere.center) - bSphere2.radius - face1.boundingSphere.radius;

                if (min <= minMax) {
                    minV2s.push(j);
                }
            }

            minMax = Number.MAX_VALUE;
            for (var i = 0; i < minV1s.length; i++) {

                bSphere1 = face1.bSpheres[minV1s[i] / 3];

                for (var j = 0; j < minV2s.length; j++) {

                    bSphere2 = face2.bSpheres[minV2s[j] / 3];
                    var min = bSphere1.center.distanceTo(bSphere2.center) - bSphere1.radius - bSphere2.radius;
                    var max = bSphere1.center.distanceTo(bSphere2.center) + bSphere1.radius + bSphere2.radius;

                    if (max < minMax) {
                        minMax = max;
                        mins.push({ i: minV1s[i], j: minV2s[j], value: min });
                    }
                }
            }

            for (var k = 0; k < mins.length; k++) {

                if (mins[k].value <= minMax && mins[k].value < minDist) {

                    var p = this.nearestPointsInTriangleToTriangle(v1s[mins[k].i], v1s[mins[k].i + 1], v1s[mins[k].i + 2], v2s[mins[k].j], v2s[mins[k].j + 1], v2s[mins[k].j + 2]);
                    if (p[0].distanceTo(p[1]) < minDist) {
                        minDist = p[0].distanceTo(p[1]);
                        nearestPoints = p;
                    }
                }
            }

            this.drawLine(nearestPoints[0], nearestPoints[1]);

            return [nearestPoints[0], nearestPoints[1]];

        };

        // Measure from Face to Edge
        this.faceToEdgeMeasure = function (face, normal, faceIntersectPoint, edge, edgeIntersectPoint) {

            var smallNum = 0.01;

            var eps = _snapper.getEndPointsInEdge(edge);
            var p1;
            var p2;

            if (eps[0].distanceTo(faceIntersectPoint) < eps[1].distanceTo(faceIntersectPoint)) {
                p1 = eps[0];
                p2 = eps[1];
            }
            else {
                p1 = eps[1];
                p2 = eps[0];
            }

            var X0 = new THREE.Vector3();
            X0.subVectors(p2, p1);

            var angle = this.angleLineToPlane(X0, normal);

            if (X0.dot(normal) <= smallNum && X0.dot(normal) >= -smallNum) { // the edge is parallel with the face

                var p = face.vertices[0];
                var X1 = this.nearestPointInPointToPlane(p1, p, normal);

                var point = this.nearestPointInPointToLine(edgeIntersectPoint, p1, p2);
                this.faceToPointMeasure(face, normal, faceIntersectPoint, point);

                return [p1, X1, angle];
            }
            else { // nonparallel between edge and face

                // Find the nearest point on the edge to the intersectPoint, make this point as the new endpoint of the edge,
                // because we don't want to draw the arc so big, this is consistent with Fusion
                var newEp = this.nearestPointInPointToLine(edgeIntersectPoint, p1, p2);

                this.drawAngleEdgeToFace(face.vertices[0], normal, faceIntersectPoint, p1, newEp, angle);

                //var X1 = this.nearestPointsInEdgeToFace(edge, face);

                //this.drawLine(X1[0], X1[1]);
                //return [X1[0], X1[1], angle];
                return angle;
            }

        };

        // Measure from Edge to Face
        this.edgeToFaceMeasure = function (edge, edgeIntersectPoint, face, normal, faceIntersectPoint) {

            var smallNum = 0.01;

            var eps = _snapper.getEndPointsInEdge(edge);
            var p1;
            var p2;

            if (eps[0].distanceTo(faceIntersectPoint) < eps[1].distanceTo(faceIntersectPoint)) {
                p1 = eps[0];
                p2 = eps[1];
            }
            else {
                p1 = eps[1];
                p2 = eps[0];
            }

            var X0 = new THREE.Vector3();
            X0.subVectors(p2, p1);

            var angle = this.angleLineToPlane(X0, normal);

            if (X0.dot(normal) <= smallNum && X0.dot(normal) >= -smallNum) { // the edge is parallel with the face

                var p = face.vertices[0];
                var X1 = this.nearestPointInPointToPlane(p1, p, normal);

                var newp1 = new THREE.Vector3();
                newp1.subVectors(faceIntersectPoint, X1);
                newp1.add(p1);

                var newp2 = new THREE.Vector3();
                newp2.subVectors(faceIntersectPoint, X1);
                newp2.add(p2);

                this.drawLine(newp1, faceIntersectPoint);
                this.drawExtensionLinePointToPoint(newp1, newp2);
                return [p1, X1, angle];
            }
            else { // nonparallel between edge and face

                // Find the nearest point on the edge to the intersectPoint, make this point as the new endpoint of the edge,
                // because we don't want to draw the arc so big, this is consistent with Fusion
                var newEp = this.nearestPointInPointToLine(edgeIntersectPoint, p1, p2);

                this.drawAngleEdgeToFace(face.vertices[0], normal, faceIntersectPoint, p1, newEp, angle);

                //var X1 = this.nearestPointsInEdgeToFace(edge, face);

                //this.drawLine(X1[0], X1[1]);
                //return [X1[0], X1[1], angle];
                return angle;
            }

        };

        // Get the angle between line and plane
        this.angleLineToPlane = function (v, n) {

            var angle = this.angleVectorToVector(v, n);

            if (angle > 90) {
                angle -= 90;
            }
            else {
                angle = 90 - angle;
            }

            return angle;
        };

        // Draw angle between edge and face
        this.drawAngleEdgeToFace = function (p0, n0, faceIntersectPoint, p1, p2, angle) {

            var p = this.intersectPointLineToPlane(p0, n0, p1, p2);
            if (!p) {
                return;
            }

            var ep1 = p2;

            if (angle === 90) {   // edge and face are vertical with each other
                var ep2 = faceIntersectPoint.clone();
            }
            else {
                var ep2 = this.nearestPointInPointToPlane(p2, p0, n0);
            }

            var n = new THREE.Vector3();
            var n1 = new THREE.Vector3();
            var n2 = new THREE.Vector3();
            n1.subVectors(p2, p1);
            n2.subVectors(ep2, p);
            n.crossVectors(n1, n2);
            n.normalize();

            var midPoint = new THREE.Vector3();

            this.drawAngle(p, ep1, ep2, n, angle, midPoint);

            if (_consumeSingleClick) {

                var label = _angleLabel.label;
                if (!label) {

                    label = _angleLabel.label = document.createElement('div');
                    label.className = 'measure-length';
                    _viewer.container.appendChild(label);

                    var text = document.createElement('div');
                    text.className = 'measure-length-text';
                    label.appendChild(text);

                    label.style.pointerEvents = 'none';

                    // This button is for Markup and Comments
                    //var button = document.createElement('div');
                    //button.className = 'measure-length-button';
                    //button.style.cursor = 'pointer';
                    //button.addEventListener('click', function (event) {
                    //
                    //}, true);
                    //label.appendChild(button);
                }

                label.children[0].textContent = tool.getAngle();
                label.classList.toggle('visible', true);

                _angleLabel.p1 = midPoint.clone();
                _angleLabel.p2 = midPoint.clone();

                this.updateLabelPositions();
            }
        };

        // Get the intersect point between line and plane
        this.intersectPointLineToPlane = function (p0, n0, p1, p2) {

            var smallNum = 0.001;

            var u = new THREE.Vector3();
            var w = new THREE.Vector3();
            u.subVectors(p2, p1);
            w.subVectors(p1, p0);

            var D = n0.dot(u);
            var N = -n0.dot(w);

            if (Math.abs(D) < smallNum) {  // edge is parallel to plane
                if (N == 0)                      // edge lies in plane
                    return null;
                else
                    return null;                    // no intersection
            }

            // they are not parallel
            u.multiplyScalar(N / D);             // compute segment intersect point
            u.add(p1);
            return u;
        };

        // Find the vertex need to draw For circular arc's radius
        this.nearestVertexInVertexToEdge = function (vertex, edge) {

            var nearestPoint;
            var minDist = Number.MAX_VALUE;

            for (var i = 0; i < edge.vertices.length; i++) {
                var dist = vertex.distanceTo(edge.vertices[i]);
                if (minDist > dist) {
                    nearestPoint = edge.vertices[i];
                    minDist = dist;
                }
            }

            return nearestPoint;
        };

        this.isEqualVectors = function (v1, v2, precision) {

            if (Math.abs(v1.x - v2.x) <= precision && Math.abs(v1.y - v2.y) <= precision && Math.abs(v1.z - v2.z) <= precision) {

                return true;
            }

            return false;
        };

        this.isInverseVectors = function (v1, v2, precision) {

            if (Math.abs(v1.x + v2.x) <= precision && Math.abs(v1.y + v2.y) <= precision && Math.abs(v1.z + v2.z) <= precision) {

                return true;
            }

            return false;
        };

        // Set if collapse or expand the xyz delta distance
        this.setSimple = function (simple) {
            if (_simple != simple) {
                _simple = simple;

                for (var name in _lines) {
                    if (name !== 'xyz' && _lines.hasOwnProperty(name)) {
                        var item = _lines[name];
                        if (item.line) {
                            item.line.visible = !simple;

                            if (item.label) {
                                item.label.classList.toggle('visible', !simple);
                            }
                        }
                    }
                }

                _viewer.impl.invalidate(false, false, /*overlayDirty=*/true);
            }
        };

        this.hide = function () {

            //PIERRE Clone the old Measurement
            if (_lines.xyz.p1 && _lines.xyz.p2) {
                this.copyPrevMeasure();
            }

            for (name in _lines) {
                if (_lines.hasOwnProperty(name)) {
                    var item = _lines[name];
                    if (item.line) {
                        //item.line.visible = false;
                    }
                    if (item.label) {
                        if (item.label.classList[0] == "measure-length") {
                            //var newObject = jQuery.extend(true, {}, item);
                        }
                        // item.label.classList.remove('visible');
                    }
                }
            }

            var name;

            for (name in _endPoints) {
                if (_endPoints.hasOwnProperty(name)) {
                    var endPoint = _endPoints[name];
                    if (endPoint.mesh) {
                        endPoint.mesh.visible = false;
                    }
                    if (endPoint.label) {
                        endPoint.label.classList.remove('visible');
                    }
                }
            }

            for (name in _edges) {
                if (_edges.hasOwnProperty(name)) {
                    var edge = _edges[name];
                    if (edge.line) {
                        for (var i in edge.line) {
                            edge.line[i].visible = false;
                        }
                    }
                    if (edge.label) {
                        edge.label.classList.remove('visible');
                    }
                }
            }

            for (name in _faces) {
                if (_faces.hasOwnProperty(name)) {
                    var face = _faces[name];
                    if (face.mesh) {
                        face.mesh.visible = false;
                    }
                    if (face.label) {
                        face.label.classList.remove('visible');
                    }
                }
            }

            for (name in _lines) {
                if (_lines.hasOwnProperty(name)) {
                    var item = _lines[name];
                    if (item.line) {
                        item.line.visible = false;
                    }
                    if (item.label) {
                        item.label.classList.remove('visible');
                    }
                }
            }

            if (_angleLabel.label) {
                _angleLabel.label.classList.remove('visible');
            }

            if (_materialAngle) {

                _viewer.impl.clearOverlay(kAngleOverlayName);
                _viewer.impl.clearOverlay(kAngleOutlineOverlayName);
            }

            if (_materialExtensionLine) {

                _viewer.impl.clearOverlay(kExtensionLineOverlayName);
            }

            if (_materialExtensionFace) {

                _viewer.impl.clearOverlay(kExtensionFaceOverlayName);
            }

            if (_materialGreyOutPlane) {
                _viewer.impl.clearOverlay(kGreyOutPlaneOverlayName);
            }

            _viewer.impl.invalidate(false, false, /*overlayDirty=*/true);
        };

        this.hideClick = function (clickName) {

            if (_endPoints.hasOwnProperty(clickName)) {
                var endPoint = _endPoints[clickName];
                if (endPoint.mesh) {
                    endPoint.mesh.visible = false;
                }
                if (endPoint.label) {
                    endPoint.label.classList.remove('visible');
                }
            }

            if (_edges.hasOwnProperty(clickName)) {
                var edge = _edges[clickName];
                if (edge.line) {
                    for (var i in edge.line) {
                        edge.line[i].visible = false;
                    }
                }
                if (edge.label) {
                    edge.label.classList.remove('visible');
                }
            }

            if (_faces.hasOwnProperty(clickName)) {
                var face = _faces[clickName];
                if (face.mesh) {
                    face.mesh.visible = false;
                }
                if (face.label) {
                    face.label.classList.remove('visible');
                }
            }

            for (var name in _lines) {
                if (_lines.hasOwnProperty(name)) {
                    var item = _lines[name];
                    if (item.line) {
                        item.line.visible = false;
                    }
                    if (item.label) {
                        item.label.classList.remove('visible');
                    }
                }
            }

            if (_angleLabel.label) {
                _angleLabel.label.classList.remove('visible');
            }

            if (_materialAngle) {

                _viewer.impl.clearOverlay(kAngleOverlayName);
                _viewer.impl.clearOverlay(kAngleOutlineOverlayName);
            }

            if (_materialExtensionLine) {

                _viewer.impl.clearOverlay(kExtensionLineOverlayName);
            }

            if (_materialExtensionFace) {

                _viewer.impl.clearOverlay(kExtensionFaceOverlayName);
            }

            _viewer.impl.invalidate(false, false, /*overlayDirty=*/true);

        };

        this.destroy = function () {

            //PIERRE destroy the previous measures
            this.destroyPrevMeasure();

            var name;

            for (name in _endPoints) {
                if (_endPoints.hasOwnProperty(name)) {
                    var endPoint = _endPoints[name];
                    if (endPoint.mesh) {
                        _viewer.impl.removeOverlay(kEndPointOverlayName, endPoint.mesh);
                        endPoint.mesh = endPoint.geometry = null;
                    }
                    if (endPoint.label) {
                        endPoint.label.parentNode.removeChild(endPoint.label);
                        endPoint.label = null;
                    }
                }
            }

            for (name in _edges) {
                if (_edges.hasOwnProperty(name)) {
                    var edge = _edges[name];
                    if (edge.line) {
                        _viewer.impl.removeMultipleOverlays(kEdgeOverlayName, edge.line);
                        edge.line = edge.intersectPoint = null;
                    }
                    if (edge.label) {
                        edge.label.parentNode.removeChild(edge.label);
                        edge.label = null;
                    }
                }
            }

            for (name in _faces) {
                if (_faces.hasOwnProperty(name)) {
                    var face = _faces[name];
                    if (face.mesh) {
                        _viewer.impl.removeOverlay(kFaceOverlayName, face.mesh);
                        face.mesh = face.intersectPoint = null;
                    }
                    if (face.label) {
                        face.label.parentNode.removeChild(face.label);
                        face.label = null;
                    }
                }
            }

            if (_materialPoint) {
                _materialPoint = null;
                _viewer.impl.removeOverlayScene(kEndPointOverlayName);
            }

            if (_materialFace) {
                _materialFace = null;
                _viewer.impl.removeOverlayScene(kFaceOverlayName);
            }

            if (_materialLine) {
                _materialLine = null;
                _viewer.impl.removeOverlayScene(kEdgeOverlayName);
            }

            if (_materialExtensionLine) {
                _materialExtensionLine = null;
                _viewer.impl.removeOverlayScene(kExtensionLineOverlayName);
            }

            if (_materialExtensionFace) {
                _materialExtensionFace = null;
                _viewer.impl.removeOverlayScene(kExtensionFaceOverlayName);
            }

            if (_materialGreyOutPlane) {
                _materialGreyOutPlane = null;
                _viewer.impl.clearOverlay(kGreyOutPlaneOverlayName);
            }

            for (name in _lines) {
                if (_lines.hasOwnProperty(name)) {
                    var item = _lines[name];
                    if (item.line) {
                        _viewer.impl.removeOverlay(item.overlayName, item.line);
                        _viewer.impl.removeOverlayScene(item.overlayName);
                        item.material = item.line = item.geometry = null;
                    }

                    if (item.label) {
                        item.label.parentNode.removeChild(item.label);
                        item.label = null;
                    }
                    item.material = item.line = item.geometry = item.label = item.p1 = item.p2 = null;
                }
            }

            if (_angleLabel.label) {
                _angleLabel.label.parentNode.removeChild(_angleLabel.label);
                _angleLabel.label = null;
            }
            _angleLabel.label = _angleLabel.p1 = _angleLabel.p2 = null;

        };



        //PIERRE MASSON COPY THE PREVIOUS MEASURES AND STORE THEM

        //VARIABLES
        var kPrevMeasureOverlayName = 'MeasureTool-prevMeasure',
        _prevMeasureStore = []; // Array to store the measures
        //line color
        var prevMeasureMat = new THREE.MeshBasicMaterial({
            color: parseInt('3ecff0', 16),
            depthTest: false,
            depthWrite: false
        });
        var linewidth = 10;


        //PIERRE COPY THE OLD MEASURE AND RENDER IT
        this.copyPrevMeasure = function () {
            var prevMeasure = [];
            prevMeasure.overlayName = kPrevMeasureOverlayName;

            //On first click initialize the layer
            // if (!_lines.xyz.geometry) {
            if (!_viewer.impl.overlayScenes[kPrevMeasureOverlayName]) {
                _viewer.impl.createOverlayScene(kPrevMeasureOverlayName);
                //return;
            }

            //Duplicate the rubber line of previous measure
            prevMeasureMat.opacity = 1;
            var geometry = prevMeasure.geometry = new THREE.Geometry();
            geometry.vertices.push(_lines.xyz.p1);
            geometry.vertices.push(_lines.xyz.p2);
            var line = prevMeasure.line = that.drawLineAsCylinder(geometry, prevMeasureMat, linewidth);
            _viewer.impl.addOverlay(kPrevMeasureOverlayName, line);
            line.visible = true;

            //push the points
            var p1 = prevMeasure.p1 = (_lines.xyz.p1);
            var p2 = prevMeasure.p2 = (_lines.xyz.p2);

            //Duplicate the Measure Text
            var label = prevMeasure.label = document.createElement('div');
            label.className = 'measure-length';
            var text = document.createElement('div');
            text.className = 'measure-length-text';
            //label.textContent = _lines.xyz.label.textContent;
            text.textContent = _lines.xyz.label.textContent;
            label.appendChild(text);
            prevMeasure.position = _lines.xyz.position;
            _viewer.container.appendChild(prevMeasure.label);
            label.classList.toggle('visible', true);

            // set the color of label background
            label.style.backgroundColor = 'lightblue';
            label.style.opacity = 0.98;


            _viewer.impl.invalidate(true);

            //add it to the store
            _prevMeasureStore.push(prevMeasure);
        }

        this.updatePrevLabelPositions = function () {

            if (_prevMeasureStore.length == 0) { return;}

            for (var i in _prevMeasureStore) {
                    var item = _prevMeasureStore[i];
                    label = item.label;

                    if (label) {
                        var xy = project((item.p1.x + item.p2.x) / 2, (item.p1.y + item.p2.y) / 2, (item.p1.z + item.p2.z) / 2); // TODO: avoid collisions for labels
                        label.style.top = xy.y + 'px';
                        label.style.left = xy.x + 'px';
                        //_labels.push(label);
                    }
            }


            function project(x, y, z) {
                var camera = _viewer.navigation.getCamera(),
                    containerBounds = _viewer.navigation.getScreenViewport(),
                    p = new THREE.Vector3(x, y, z);

                p = p.project(camera);

                return {
                    x: Math.round((p.x + 1) / 2 * containerBounds.width) + 5,    // Add 5px to make the label not to be on the object
                    y: Math.round((-p.y + 1) / 2 * containerBounds.height) + 5    // Add 5px to make the label not to be on the object
                };
            }
        }

        this.destroyPrevMeasure = function () {

            if (_prevMeasureStore.length == 0) { return; }

            for (var i in _prevMeasureStore) {
                var item = _prevMeasureStore[i];

                if (item.line) {
                    _viewer.impl.removeOverlay(item.overlayName, item.line);              
                    item.material = item.line = item.geometry = null;
                }

                if (item.label) {
                    //remove the text
                    if (label.childNodes[0]) {
                        label.removeChild(label.childNodes[0]);
                    }
                    item.label.parentNode.removeChild(item.label);
                    item.label = null;
                }
                item.material = item.line = item.geometry = item.label = item.p1 = item.p2 = null;
               // item = null;
            }

            _prevMeasureStore = [];
            _viewer.impl.removeOverlayScene(item.overlayName);
            }




    }

};
;
