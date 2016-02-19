(function () {

var canvas = document.getElementById('c'),
    host = window.location.host,
    context = canvas.getContext("2d"),
    W = canvas.width  = window.innerWidth-6,
    H = canvas.height = window.innerHeight-50,
    world = {},
    drawNext = true,
    counter = 0,
    host = "http://localhost:5000";


function postJSON(url, objects, callback) {
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function () {
        if (xhr.readyState==4) {
            try {
                if (xhr.status==200) {
                    callback(null, JSON.parse(xhr.responseText));
                }
            } 
            catch(e) {
                alert('Error: ' + e.name);
                callback(e);
            }
        }
    };
    xhr.open('POST', url, true);
    xhr.setRequestHeader("Content-type", "application/json");
    xhr.setRequestHeader("Accept", "application/json");
    xhr.send(JSON.stringify(objects));
}

function requestJSON(url, callback) {
    var xhr = new XMLHttpRequest();

    xhr.open('GET', url, true);
    xhr.onload = function () {
        callback(JSON.parse(this.responseText));
    };
    xhr.setRequestHeader("Content-type", "application/json");
    xhr.setRequestHeader("Accept", "application/json");
    xhr.send();
}

//XXX: TODO Make this prettier!
function drawCircle(context,entity) {
    with(context) {
        beginPath();              
        lineWidth = 3;
        var x = entity["x"];
        var y = entity["y"];
        moveTo(x,y);
        fillStyle = entity["colour"];
        strokeStyle = fillStyle;
        arc(x, y, (entity["radius"])?entity["radius"]:50, 0, 2.0 * Math.PI, false);  
        stroke();                                
    }
}

function prepEntity(entity) {
    if (!entity["colour"]) {
        entity["colour"] = "#FF0000";
    }
    if (!entity["radius"]) {
        entity["radius"] = 50;
    }
    return entity;
}

function clearFrame() {
    with(context) {
    moveTo(0,0);
    fillStyle = "#000";
    fillRect(0,0,W,H);
    }
}

// This actually draws the frame
function renderFrame() {
    clearFrame();
    for (var key in world) {
        var entity = world[key];
        drawCircle(context,prepEntity(entity));
    }
}

// Signals that there's something to be drawn
function drawNextFrame() {
    drawNext = true;
}

// This optionally draws the frame, call this if you're not sure if you should update
// the canvas
function drawFrame() {
    if (drawNext) {
        renderFrame();
        drawNext = false;
    }
}

// This is unpleasent, canvas clicks are not handled well
// So use this code, it works well on multitouch devices as well.

function getPosition(e) {
    if ( e.targetTouches && e.targetTouches.length > 0) {
        var touch = e.targetTouches[0];
        var x = touch.pageX  - canvas.offsetLeft;
        var y = touch.pageY  - canvas.offsetTop;
        return [x,y];
    } else {
        var rect = e.target.getBoundingClientRect();
        var x = e.offsetX || e.pageX - rect.left - window.scrollX;
        var y = e.offsetY || e.pageY - rect.top  - window.scrollY;
        var x = e.pageX  - canvas.offsetLeft;
        var y = e.pageY  - canvas.offsetTop;
        return [x,y];
    }
}

function addEntity(entity, data) {
    world[entity] = data;
    //XXX: Send a XHTML Request that updates the entity you just  modified!
    var url = host + '/entity/' + entity;
    postJSON(url, data, function (error, res) {
        if (error) { return console.log(error); }
        drawNextFrame();
    });
}

function addEntityWithoutName(data) {
    //var name = "X"+Math.floor((Math.random()*100)+1);
    var name = "X"+(counter++)%100;
    addEntity(name,data);
}

// canvas + mouse/touch is complicated 
// I give you this because well the mouse/touch stuff is a total
// pain to get right. This has some out of context bug too.
mouse = (function() {
    // Now this isn't the most popular way of doing OO in 
    // Javascript, but it relies on lexical scope and I like it
    // This isn't 301 so I'm not totally bound to OO :)
    var self;    
    self = {
        clicked: 0,
        // these are listener lists append to them
        mousemovers: [],
        mousedraggers: [],
        mousedowners: [],
        mouseuppers: [],
        callListeners: function(listeners,x,y,clicked,e) {
            for (i in listeners) {
                listeners[i](x,y,clicked,e);
            }
        },
        wasClicked: function(e) {
            var pos = getPosition(e);
            var x = pos[0];
            var y = pos[1];
            if (x >= 0 && x <= W && y >= 0 && y <= H) {
                return 1;
            } else {
                return 0;
            }
        },
        mousedown: function(e) {
            e.preventDefault();
            if (self.wasClicked(e)) {
                var pos = getPosition(e);
                var x = pos[0];
                var y = pos[1];
            self.clicked = 1;
                self.callListeners(self.mousedowners,x,y,self.clicked,e);
                //addEntityWithoutName({'x':x,'y':y,'colour':'red'});
            }
        },
        mouseup: function(e) {
            e.preventDefault();
            //alert(getPosition(e));
            if (self.wasClicked(e)) {
                var pos = getPosition(e);
                var x = pos[0];
                var y = pos[1];
            //self.poppin(x,y);
            self.clicked = 0;
                self.selected = -1;
                self.callListeners(self.mouseuppers,x,y,self.clicked,e);
                //addEntityWithoutName({'x':x,'y':y,'colour':'blue'});
            }
        },
        touchstart: function(e) {
            self.lasttouch = e;                                         
            return self.mousedown(e);
        },
    touchend: function(e) {
            var touch = (self.lasttouch)?self.lasttouch:e;
            return self.mouseup(touch);
    },
    mousemove: function(e) {
            e.preventDefault();
            if (self.wasClicked(e)) {
                var pos = getPosition(e);
                var x = pos[0];
                var y = pos[1];
            if (self.clicked != 0) {
                //self.squeakin(x,y);
                    self.callListeners(self.mousedraggers,x,y,self.clicked,e);
            }
                self.callListeners(self.mousemovers,x,y,self.clicked,e);
            }            
    },
    touchmove: function(e) {
            self.lasttouch = e;                                         
            return self.mousemove(e);
    },
    // Install the mouse listeners
    mouseinstall: function() {
            canvas.addEventListener("mousedown",  self.mousedown, false);
            canvas.addEventListener("mousemove",  self.mousemove, false);
            canvas.addEventListener("mouseup",    self.mouseup, false);
            canvas.addEventListener("mouseout",   self.mouseout, false);
            canvas.addEventListener("touchstart", self.touchstart, false);
            canvas.addEventListener("touchmove",  self.touchmove, false);
            canvas.addEventListener("touchend",   self.touchend, false);
    }
    };
    // Force install!
    self.mouseinstall();
    return self;
})();

// Add the application specific mouse listeners!
//XXX: TODO Make these prettier!
mouse.mousedowners.push(function(x,y,clicked,e) {
    addEntityWithoutName({'x':x,'y':y,'colour':'blue'});
});

mouse.mouseuppers.push(function(x,y,clicked,e) {
    addEntityWithoutName({'x':x,'y':y,'colour':'red'});
});

mouse.mousedraggers.push(function(x,y,clicked,e) {
    addEntityWithoutName({'x':x,'y':y,'colour':'green',
                          'radius':10});
});

function update() {
    //XXX: TODO Get the world from the webservice using a XMLHTTPRequest
    var url = host + '/world'
    requestJSON(url, function (data) {
        world = data;
        renderFrame();
    });
}

// 30 frames per second
setInterval( update, 1000/30.0);

})();






