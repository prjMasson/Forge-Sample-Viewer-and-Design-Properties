function viz(x) {
    var o = '';
    x = x.map(function (y) { return ~~y; });
    for (var i = 0; i < 80; i++) {
        if (x.indexOf(i) === -1) {
            o += ' ';
        } else {
            o += '|';
        }
    }
    return o;
}

function k_means1(x, n, means) {

    // A simple average function, just because
    // JavaScript doesn't provide one by default.
    function avg(x) {
        var s = 0;
        for (var i = 0; i < x.length; i++) {
            s += x[i];
        }
        return (x.length > 0) ? (s / x.length) : 0;
    }

    // n is the number of means to choose.
    if (n === 0) {
        return null;
    } else if (n > x.length) {
        return null;
    }

    var seen = {};

    if (!means) {
        means = [];
        // Randomly choose k means from the data and make sure that no point
        // is chosen twice. This bit inspired by polymaps
        while (means.length < n) {
            var idx = Math.floor(Math.random() * (x.length - 1));
            if (!seen[idx]) {
                means.push({ val: x[idx], vals: [] });
                seen[idx] = true;
            }
        }
    }

    var i;
    // For every value, find the closest mean and add that value to the
    // mean's `vals` array.
    for (i = 0; i < x.length; i++) {
        var dists = [];
        for (var j = 0; j < means.length; j++) {
            dists.push(Math.abs(x[i] - means[j].val));
        }
        var closest_index = dists.indexOf(Math.min.apply(null, dists));
        means[closest_index].vals.push(x[i]);
    }

    // Create new centers from the centroids of the values in each
    // group.
    //
    // > In the case of one-dimensional data, such as the test scores,
    // the centroid is the arithmetic average of the values
    // of the points in a cluster.
    //
    // [Vance Faber](http://bit.ly/LHCh2y)
    var newvals = [];
    for (i = 0; i < means.length; i++) {
        var centroid = avg(means[i].vals);
        //define min and Max for the name of Array
        var max = Math.max.apply(null, means[i].vals);
        var min = Math.min.apply(null, means[i].vals);
        newvals.push({
            val: centroid,
            vals: means[i].vals,
            min: min,
            max: max
        });
    }

    //sort min to max by centroid
    newvals.sort(function (a, b) { //Array now becomes [41, 25, 8, 7]
        return  a.val -b.val;
    })

    return newvals;
}

var x = [];

for (var i = 0; i < 80; i++) {
    x.push(Math.floor((Math.random() * 80)));
}