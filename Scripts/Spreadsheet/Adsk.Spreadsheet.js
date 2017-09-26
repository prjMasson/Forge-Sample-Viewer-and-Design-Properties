///////////////////////////////////////////////////////////////////////////////

//
///////////////////////////////////////////////////////////////////////////////
AutodeskNamespace("Adsk.Spreadsheet");

var viewer;

Adsk.Spreadsheet = function (_viewer, options) {
    Autodesk.Viewing.Extension.call(this, _viewer, options);
    var _self = this; viewer = _viewer;

    var _components = null;

    //for the datatable and the design properties
    var dTable = null;
    var dataSet = [];

    // load callback
    _self.load = function () {

        getAllLeafComponents(function (components) {
            _components = components;
            getPropertiesAndSetDataTable(components)
        });
        

        console.log('Autodesk.ADN.Viewing.Extension.Spreadsheet loaded');

        return true;
    };

    // unload callback
    _self.unload = function () {
        console.log('Autodesk.ADN.Viewing.Extension.Spreasheet unloaded');
        return true;
    };


    //preparing the datatable
    var compBulkNumber = 400; var propertiesMap = {};
    function getPropertiesAndSetDataTable(components){
        var merged = flatten(components, []);
        if (!merged) { return;}


        //if not much component, load all props at once
        if (merged.length < compBulkNumber) {
            getPropertiesForFlatComponentArray(merged, function (datas, properties) {
                //create the datatable based on the design properties
                dTable = Adsk_Spreadsheet_Datatable(datas, properties);
            });
        } else {
            //if too many components load properties by bulk
            var index = 0;
            var mergedSlice = merged.slice(index, index + compBulkNumber);
            index += compBulkNumber;
            getPropertiesForFlatComponentArray(mergedSlice, function (datas,properties) {
                //create the datatable based on the design properties
                dTable = Adsk_Spreadsheet_Datatable(datas, properties);
                while (true) {
                    var nextIndex = index + compBulkNumber; var stop = false;
                    if (nextIndex >= merged.length-1) { nextIndex = merged.length - 1; stop = true; }
                    var mergedSlice = merged.slice(index, nextIndex);
                    getPropertiesForFlatComponentArray(mergedSlice, function (datas,properties) {
                        //create the datatable based on the design properties
                        addRowsInBulkToTable(datas, properties, stop);
                    });
                    index = nextIndex;
                    if (stop) { break; }
                }
            });
          

        }
    }

    // Store all properties from components and store the property names
    function getPropertiesForFlatComponentArray(components, onResult) {
        var designProps = [];
        async.each(components,
              function (component, callback) {
                  viewer.getProperties(component.dbId, function (result) {
                      //build the model for the datatable
                      var objProp = {}; objProp.dbId = result.dbId; objProp.name = result.name;
                      for (var i = 0; i < result.properties.length; i++) {
                          //if hidden property then skip
                          if (result.properties[i].hidden == 1) { continue; }

                          var prop = result.properties[i];
                          if (prop.displayValue) {
                              objProp[prop.displayName] = prop.displayValue;
                              propertiesMap[prop.displayName] = {};
                          }
                      }

                      //add the parent name hierarchy as a flat string
                      var parentName="";
                      for (var i = 0; i < component.parents.length; i++) { parentName += component.parents[i] + "/";}
                      parentName += component.name;
                      objProp.FullName = parentName; propertiesMap.FullName = {};
                      //delete the name property as this appears duplicate 
                      delete objProp.name; if (objProp['Component Name']) {
                          delete objProp['Component Name']; delete propertiesMap['Component Name']; delete propertiesMap.name;
                      }
                      //push the object properties in the datatable
                      designProps.push(objProp);

                      callback();
                  });
              },
              function (err) {
                  onResult(designProps, Object.keys(propertiesMap));
              });

    }

    //get properties for one component and store in DataSet
    //TODO handle duplicates of component prop in DataSet array
    function getComponentProperties(component, callback) {
        viewer.getProperties(component.dbId, function (result) {
            //build the model for the datatable
            var objProp = {}; objProp.dbId = result.dbId; objProp.name = result.name;
            for (var i = 0; i < result.properties.length; i++) {
                //if hidden property then skip
                if (result.properties[i].hidden == 1) { continue; }

                var prop = result.properties[i];
                if (prop.displayValue) {
                    objProp[prop.displayName] = prop.displayValue;
                    propertiesMap[prop.displayName] = {};
                }
            }

            //add the parent name hierarchy as a flat string
            var parentName = "";
            for (var i = 0; i < component.parents.length; i++) { parentName += component.parents[i] + "/"; }
            parentName += component.name;
            objProp.FullName = parentName; propertiesMap.FullName = {};
            //delete the name property as this appears duplicate 
            delete objProp.name; if (objProp['Component Name']) {
                delete objProp['Component Name']; delete propertiesMap['Component Name']; delete propertiesMap.name;
            }
            //push the object properties in the datatable
            dataSet.push(objProp);

            callback();
        });
    };

//flattening the component Array and pushing the Parent hierarchy as array 
    function flatten(array, parentNames, result) {

        if (array == null) { return null; }

        if (!result) {
            result = [];
        }

        var element = {};
        for (var propertyName in array) {
            if (propertyName.toString() == "children") {
                continue;
            }
            element[propertyName] = array[propertyName];
        }
        //check if it has the parent property
        element.parents = parentNames;
        result.push(element);

        if (typeof (array.children) == 'undefined') {
            return result;
        }


        for (var i = 0; i < array.children.length; i++) {
            var newParentArray = element.parents.slice(0);
            newParentArray.push(element.name);
            flatten(array.children[i], newParentArray, result);
        }

        return result;
    }

    // Get all leaf components
    function getAllLeafComponents(callback) {

        function getLeafComponentsRec(parent) {

            var components = [];

            if (typeof parent.children !== "undefined") {

                var children = parent.children;

                for (var i = 0; i < children.length; i++) {

                    var child = children[i];

                    if (typeof child.children !== "undefined") {

                        var subComps = getLeafComponentsRec(child);

                        components.push.apply(components, subComps);
                    }
                    else {
                        components.push(child);
                    }
                }
            }

            return components;
        }

        viewer.addEventListener(Autodesk.Viewing.OBJECT_TREE_CREATED_EVENT, _onGeometryLoaded);
        // GEOMETRY_LOADED_EVENT
        //wait until geometry is loaded to get the model
        function _onGeometryLoaded(event) {
            var allLeafComponents = buildModelTree(viewer.model);
            callback(allLeafComponents);
        };

    };

    // Recursively builds the model tree
    function buildModelTree(model) {

        //builds model tree recursively
        function _buildModelTreeRec(node) {

            instanceTree.enumNodeChildren(node.dbId,
              function (childId) {

                  node.children = node.children || [];
                  var childNode = {
                      dbId: childId,
                      name: instanceTree.getNodeName(childId)
                  }
                  node.children.push(childNode);
                  _buildModelTreeRec(childNode);
              });
        }

        //get model instance tree and root component
        var data = model.getData();
        var instanceTree = model.getData().instanceTree;

        //if no instance tree like for 2D Data then stop
        if (instanceTree == undefined) { return null;}

        var rootId = instanceTree.getRootId();

        var rootNode = {
            dbId: rootId,
            name: instanceTree.getNodeName(rootId)
        }

        _buildModelTreeRec(rootNode);

        return rootNode;
    }

    // Recursively execute task on model tree
    function executeTaskOnModelTree(model, task) {
        var taskResults = [];

        function _executeTaskOnModelTreeRec(dbId) {

            instanceTree.enumNodeChildren(dbId,
              function (childId) {

                  taskResults.push(task(model, childId));
                  _executeTaskOnModelTreeRec(childId);
              });
        }

        //get model instance tree and root component
        var instanceTree = model.getData().instanceTree;
        var rootId = instanceTree.getRootId();
        _executeTaskOnModelTreeRec(rootId);
        return taskResults;
    }

    // Get property value from display name
    function getPropertyValue(dbId, displayName, callback) {

        function _cb(result) {

            if (result.properties) {
                for (var i = 0; i < result.properties.length; i++) {

                    var prop = result.properties[i];
                    if (prop.displayName === displayName) {
                        callback(prop.displayValue);
                        return;
                    }
                }
                callback('undefined');
            }
        }
        viewer.getProperties(dbId, _cb);
    };


};

//data properties functions

//when column is clicked in datatable, values are value from each column cell, dbIds is dbId from each row visible
function createChartfromTableData(values, dbId, propName) {
    var data = groupKeysAndPutArrayOfValue(values, dbId);
    createChartFromProperties(propName, data);

}

//keys and values must be same length
function groupKeysAndPutArrayOfValue(dkeys, values) {
    var data = {};

    for (var i = 0; i < dkeys.length; i++) {
        if (!data[dkeys[i]]) {
            data[dkeys[i]] = [];
        } 
        data[dkeys[i]].push(values[i]);
    }

    return data;

}

    Adsk.Spreadsheet.prototype =
      Object.create(Autodesk.Viewing.Extension.prototype);

    Adsk.Spreadsheet.prototype.constructor =
      Adsk.Spreadsheet;

    Autodesk.Viewing.theExtensionManager.registerExtension(
      'Adsk.Spreadsheet',
      Adsk.Spreadsheet);




    //function refreshProperties(components) {

    //    getAvailableProperties(components, function (properties) {
    //        var menuItems = [];
    //        var labelIdx = 0;
    //        _propName = properties[0];
    //        columns = properties;
    //    });
//}


    //// Maps components by property
    //function mapComponentsByPropName(propName, components, onResult) {

    //    var componentsMap = {};
    //    var merged = flatten(components, []);

    //    async.each(merged,
    //  function (component, callback) {
    //      getPropertyValue(component.dbId, propName, function (value) {

    //          if (propName === 'label') {
    //              value = value.split(':')[0];
    //          }

    //          if (!componentsMap[value]) {

    //              componentsMap[value] = [];
    //          }

    //          componentsMap[value].push(component.dbId);

    //          callback();
    //      });
    //  },
    //  function (err) {

    //      onResult(componentsMap);
    //  });

    //}
