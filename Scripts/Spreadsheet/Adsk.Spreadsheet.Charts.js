
var chartMaxNum = 1;    //maximum number of charts displayed at the same time
var charts = []; //storing canvasid of each chart
var clusterNumericalValue = 0;  //clustering in the number defined here the numerical values from a prop, useful for mass props or costs for example

var ctx = '#Charts'; //the div where charts will get appended to
var styleSet = false;
//create a chart from a propName, send the data as object where the key value contains array of component DBId
function createChartFromProperties(propName, map) {
    if (!styleSet) { setCSSStyle(); styleSet = true; };
    resetAllOverlays(); //reset all recolored components

    //if too many charts, remove one
    if (charts.length >= chartMaxNum) {
        charts[charts.length - 1].chart.destroy();
        $('#' + charts[charts.length - 1].id).remove();
        charts.shift();
    }

    //cluster the value if clustering is enabled
    if (clusterNumericalValue > 0) {
        map = clusterNumericalValues(map, clusterNumericalValue);
    }

    //prepare the html layout for the chart
    var _canvasId = guid(); ctx = $(ctx);
    createOverlay(_canvasId,propName);
    var canvas = $('#' + _canvasId)[0];

    //get random color
    var chartColor = getXRandomColors(Object.keys(map).length) ;
    var _data = {};
    _data.labels = Object.keys(map);
    var dataArray = new Array;
    for (var o in map) { dataArray.push(map[o].length);}
    var dbIdArray = new Array;for (var o in map) { dbIdArray.push(map[o]);}
    _data.datasets = [{ data: dataArray, backgroundColor: chartColor, dbIds: dbIdArray, color: chartColor }]; //, backgroundColor:chartColor 


    var context = document.getElementById(_canvasId).getContext('2d');
    var graph = null; graph = new Chart(context, {
        type : 'pie',
        data: _data,
        options: {
            title: {
                display: true,
                text: propName
            },
            legend: { display: false },
            tooltips: {
                custom: customToolTip
            }
        }
    });

    charts.push({ id: _canvasId, chart: graph });
      
    function createOverlay(canvasId, title) {

        var html = [
              "<canvas class='graph' id=" + canvasId + " width=" + dmPanelWidth + " height=" + dmPanelWidth + ">",
              '</canvas>',
        ].join('\n');

        $(ctx).append(html);
    };

    canvas.onmouseout = function (event) {
        //recolor the components to original
        resetColorsIsolationAndFocus();
    }

    //when placing the mouse an item trigger an interaction in the viewer
    function customToolTip(tooltipModel) {
        if (!tooltipModel.dataPoints) { return;}

        //get the dbids from chart 0 TODO, adapt for multi chart
        var idx = tooltipModel.dataPoints[0].index;
        var dbIds = charts[0].chart.data.datasets[0].dbIds[idx];
        var color = charts[0].chart.data.datasets[0].color[idx];
        setColorFromChartSegmentTooltip(dbIds, color);

    };

    };



//clustes property values if they are numerical
function clusterNumericalValues(map, clusterNumber) {
    //check if numerical values
    var keys = [];
    for (var key in map) {
        if (key == "undefined") {continue;}
        if (!isNumber(key)) {return map;}
        keys.push(parseFloat(key));
    }

    if (keys.length < clusterNumber * 1.3) { return map; }     //check if enough value to cluster, if not return

    var km = k_means1(keys, clusterNumber);     //cluster the numerical values

    if (km == null) { return map; }     //if not enough numerical values do nothing

    //remap with the components
    var newMap = {}
    for (i = 0; i < km.length; i++) {
        var cluster = km[i].vals;
        if (cluster.length == 0) { continue; }
        var array = [];
        for (j = 0; j < cluster.length; j++) {
            var val = cluster[j];
            Array.prototype.push.apply(array, map[val]);
        }
        //define min and Max for the name of Array
        var clusterName = km[i].min.toString() + " to " + km[i].max.toString();
        newMap[clusterName] = array;
    }

    return newMap;
}

function isNumber(n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
}

//generate random GUID
function guid() {
    var d = new Date().getTime();
    var guid = 'xxxx-xxxx-xxxx-xxxx'.replace(
      /[xy]/g,
      function (c) {
          var r = (d + Math.random() * 16) % 16 | 0;
          d = Math.floor(d / 16);
          return (c == 'x' ? r : (r & 0x7 | 0x8)).toString(16);
      });
    return guid;
};

//dynamic CSS Style
function setCSSStyle() {
    var css = [
       'canvas.graph {',
    'top:2px;',
    'left:' + Math.floor(dmPanelWidth * 0.05) + "px;",
    'width:'+ Math.floor(dmPanelWidth*0.7)+ "px;",
    'height:' + Math.floor(dmPanelWidth * 0.7)+ "px;",
    'position:absolute;',
    'overflow:hidden;',
    'clear:both',
    '}',
    ].join('\n');
    $('<style type="text/css">' + css + '</style>').appendTo('head');
}

//switch (chartType) {
//    case 'pie':
//        graph = new Chart(ctx).Pie(data);
//        break;
//    case 'doughnut':
//        graph = new Chart(ctx).Doughnut(data);
//        break;
//    case 'polar':
//        graph = new Chart(ctx).PolarArea(data, {
//            responsive: false
//        });
//        break;
//    default:
//        break;
//}

//canvas.onclick = function (event) {

//    var segments = graph.getSegmentsAtEvent(event);

//    if (segments.length) {

//        var key = segments[0].label;

//        //recolor the components to original
//        restoreColorMaterial(recoloredComponents);

//        //isolate and color the new set of components
//        recoloredComponents = map[key];
//        viewer.fitToView(map[key]);
//        viewer.isolate(map[key]);
//        setColorMaterial(recoloredComponents, segments[0]._saved.fillColor);

//    }
//};

//canvas.onmousemove = function (event) {

//    var segments = graph.getElementsAtEvent(event);

//    if (segments.length) {

//        var key = segments[0].label;

//        //recolor the components to original
//        restoreColorMaterial(recoloredComponents);

//        //isolate and color the new set of components
//        recoloredComponents = map[key];
//        //  viewer.fitToView(map[key]);
//        viewer.isolate(map[key]);
//        setColorMaterial(recoloredComponents, segments[0]._saved.fillColor);
//    }
//}

//canvas.onmouseout = function (event) {
//    //recolor the components to original
//    restoreColorMaterial(recoloredComponents);
//    viewer.isolate([]);
//}