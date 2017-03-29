$('#svgContainer').on('load',Init).on('mousedown',Grab).on('mousemove',Drag).on('mouseup',Drop)


var SVGDocument = null;
var SVGRoot = null;

var TrueCoords = null;
var GrabPoint = null;
var BackDrop = null;
var DragTarget = null;


function Init(evt) {
    SVGDocument = evt.target;
    SVGRoot = SVGDocument;

    // these svg points hold x and y values...
    //    very handy, but they do not display on the screen (just so you know)
    TrueCoords = SVGRoot.createSVGPoint();
    GrabPoint = SVGRoot.createSVGPoint();

    // this will serve as the canvas over which items are dragged.
    //    having the drag events occur on the mousemove over a backdrop
    //    (instead of the dragged element) prevents the dragged element
    //    from being inadvertantly dropped when the mouse is moved rapidly
    BackDrop = SVGDocument.getElementById('BackDrop');
}

function Grab(evt) {
    // find out which element we moused down on
    var targetElement = evt.target;
    var parentNodeClass = targetElement.parentNode.getAttribute('class')
    
    // you cannot drag the background itself, so ignore any attempts to mouse down on it
    if (BackDrop !== targetElement) {
        //set the item moused down on as the element to be dragged
        if (parentNodeClass === "node") {
        	DragTarget = targetElement.parentNode;
        } else if (parentNodeClass === "component") {
        	//copyComponent()
        	targetElement.parentNode.setAttributeNS(null,'class','node')
        	DragTarget = targetElement.parentNode;
        } else {
        	return false
        }

        // move this element to the "top" of the display, so it is (almost)
        //    always over other elements (exception: in this case, elements that are
        //    "in the folder" (children of the folder group) with only maintain
        //    hierarchy within that group
        // DragTarget.parentNode.appendChild(DragTarget);

        // turn off all pointer events to the dragged element, this does 2 things:
        //    1) allows us to drag text elements without selecting the text
        //    2) allows us to find out where the dragged element is dropped (see Drop)
        DragTarget.setAttributeNS(null, 'pointer-events', 'none');

        // we need to find the current position and translation of the grabbed element,
        //    so that we only apply the differential between the current location
        //    and the new location
        var transMatrix = DragTarget.getCTM();
        GrabPoint.x = TrueCoords.x - Number(transMatrix.e);
        GrabPoint.y = TrueCoords.y - Number(transMatrix.f);

    }
};


function Drag(evt) {
    // account for zooming and panning
    GetTrueCoords(evt);

    // if we don't currently have an element in tow, don't do anything
    if (DragTarget) {
        // account for the offset between the element's origin and the
        //    exact place we grabbed it... this way, the drag will look more natural
        var newX = TrueCoords.x - GrabPoint.x;
        var newY = TrueCoords.y - GrabPoint.y;

        // apply a new tranform translation to the dragged element, to display
        //    it in its new location
        DragTarget.setAttributeNS(null, 'transform', 'translate(' + newX + ',' + newY + ')');

        // 关联path
	    changePaths(DragTarget,newX,newY)
    }
};


function Drop(evt) {
    // if we aren't currently dragging an element, don't do anything
    if (DragTarget) {
        // since the element currently being dragged has its pointer-events turned off,
        //    we are afforded the opportunity to find out the element it's being dropped on
        var targetElement = evt.target;
        var parentNodeClass = targetElement.parentNode.getAttribute('class')
        // turn the pointer-events back on, so we can grab this item later
        DragTarget.setAttributeNS(null, 'pointer-events', 'all');
        if ('node' === parentNodeClass) {
            // if the dragged element is dropped on an element that is a child
            //    of the folder group, it is inserted as a child of that group
            // 新增路径
            targetElement = targetElement.parentNode
            newPath(targetElement, DragTarget)
            
        } else {
            // for this example, you cannot drag an item out of the folder once it's in there;
            //    however, you could just as easily do so here
            console.log(DragTarget.id + ' has been dropped on top of ' + targetElement.id);
        }

        // set the global variable to null, so nothing will be dragged until we
        //    grab the next element
        console.log(DragTarget.id + ' has been dropped on top of ' + targetElement.id);
        DragTarget = null;
    }
}


function GetTrueCoords(evt) {
    // find the current zoom level and pan setting, and adjust the reported
    //    mouse position accordingly
    var newScale = SVGRoot.currentScale;
    var translation = SVGRoot.currentTranslate;
    TrueCoords.x = (evt.clientX - translation.x) / newScale;
    TrueCoords.y = (evt.clientY - translation.y) / newScale;
}


function changePaths(node,dx,dy) {
	var len,i,pathId
	var toPaths = node.getAttribute('to-path')
		toPaths = toPaths ? toPaths.split(' ') : []
	//var fromPaths = node.getAttribute('form-path').split(' ')

	len = toPaths.length
	for(i=0;i<len;i++) {
		pathId = toPaths[i];
		changePath(pathId,dx,dy,'toPath')
	}

	var fromPaths = node.getAttribute('from-path')
		fromPaths = fromPaths ? fromPaths.split(' ') : []

	len = fromPaths.length
	for(i=0;i<len;i++) {
		pathId = fromPaths[i];
		changePath(pathId,dx,dy,'fromPath')
	}
}

function changePath(pathId,dx,dy,type) {
	var path = SVGRoot.getElementById(pathId)
	var d = path.getAttribute('d');
	var arr = d.split(' ')
	arr.forEach(function(e,i) {
		var item = e
		item = item.replace('M','')
		item = item.replace('C','')

		arr[i] = item

		!item && arr.splice(i,1)
	})

	if (type==='toPath') {
		arr[0] = parseFloat(path.getAttribute('origin-x')) + dx 
		arr[1] = parseFloat(path.getAttribute('origin-y'))+ dy
	} else {
		arr[6] = parseFloat(path.getAttribute('end-x')) + dx 
		arr[7] = parseFloat(path.getAttribute('end-y'))+ dy
	}

	d = "M"
    for (var i=0; i<arr.length; i++){
        if (i === 2) { d += " C" }
        d += " " + arr[i] 
    }

    path.setAttributeNS(null, "d", d)
}

function newPath(originNode,endNode) {
	// 计算originNode 的左边中点
	// 计算endNode的右边中点
	var rect,translation,x,y,width,height,originPoint,endPoint

	var fromId = originNode.getAttribute('id')

	translation = originNode.getAttribute('transform')
	translation = translation ? translation.match(/-?\d+/g) : [0,0]
	rect = originNode.querySelector('rect')

	x = rect.getAttribute('x')
	y = rect.getAttribute('y')
	width = rect.getAttribute('width')
	height = rect.getAttribute('height')

	originPoint = {
		x: parseFloat(x) + parseFloat(translation[0]) + width/1,
		y: parseFloat(y) + parseFloat(translation[1]) + height/2,
	}
	originPoint.cx = originPoint.x - 0 + 20
	originPoint.cy = originPoint.y

	translation = endNode.getAttribute('transform')
	translation = translation ? translation.match(/-?\d+/g) : [0,0]

	rect = originNode.querySelector('rect')

	x = rect.getAttribute('x')
	y = rect.getAttribute('y')
	width = rect.getAttribute('width')
	height = rect.getAttribute('height')

	endPoint = {
		x: parseFloat(x) + parseFloat(translation[0]) + width/1,
		y: parseFloat(y) + parseFloat(translation[1]) + height/2,
	}
	endPoint.cx = originPoint.x - 20
	endPoint.cy = originPoint.y

	var path = document.createElementNS('http://www.w3.org/2000/svg','path')
	path.setAttributeNS(null,'id',fromId + 't6')
	path.setAttributeNS(null,'origin-x',originPoint.x)
	path.setAttributeNS(null,'origin-y',originPoint.y)
	path.setAttributeNS(null,'end-x',endPoint.x)
	path.setAttributeNS(null,'end-y',endPoint.y)
	path.setAttributeNS(null,'d','M ' + originPoint.x + ' ' + originPoint.y + ' C ' + originPoint.cx + ' ' + originPoint.cy + ' ' + endPoint.cx + ' ' + endPoint.cy + ' ' + endPoint.x + ' ' + endPoint.y )

	originNode.setAttributeNS(null,'to-path',originNode.getAttribute('to-path') + ' ' + fromId + 't6')
	endNode.setAttributeNS(null,'from-path',(endNode.getAttribute('from-path') || '') + ' ' + fromId + 't6')

	SVGRoot.appendChild(path)
}