/**
* Module that contains the array data structure implementations.
* Depends on core.js, anim.js, utils.js, effects.js, datastructures.js
*/
(function($) {
  if (typeof JSAV === "undefined") { return; }

    // initializes a data structure
   var initDs = function(dstr, element, options) {
      dstr.options = $.extend(true, {}, options);
      if ($.isArray(element)) {
        dstr.initialize(element);
      } else if (element) { // assume it's a DOM element
        dstr.element = element;
        dstr.initializeFromElement();
      } else {
        // TODO: create an element for this data structure
      }
    }; 


  // function that selects elements from $elems that match the indices
  // filter (number, array of numbers, or filter function)
  var getIndices = function($elems, indices) {
    if (typeof indices === "undefined") { return $elems; } // use all if no restrictions are given
    if ($.isFunction(indices)) { // use a filter function..
      return $elems.filter(indices); // ..and let jQuery do the work
    } else if ($.isArray(indices)) {
      // return indices that are in the array
      return $elems.filter(function(index, item) {
        for (var i=0; i < indices.length; i++) {
          if (indices[i] == index) { return true; }
        }
        return false;
      });
    } else if (typeof indices === "number"){
      return $elems.eq(indices); // return the specific index
    } else {
      try { // last resort, try if the argument can be parsed into an int..
        return $elems.eq(parseInt(indices, 10));
      } catch (err) {
        return $({}); // ..if not, return an empty set
      }
    }
  };

  /* Array data structure for JSAV library. */
  var AVArray = function(jsav, element, options) {
    this.jsav = jsav;
    initDs(this, element, options);
  };
  var arrproto = AVArray.prototype;
  JSAV.ext.ds.extend("common", arrproto); // add functionality from common
  function setHighlight(indices, mode) {
    var testDiv = $('<ol class="' + this.element[0].className + 
        '" style="position:absolute;left:-10000px">' + 
        '<li class="jsavnode jsavindex jsavhighlight"></li><li class="jsavnode jsavindex" ></li></li></ol>'),
  	  styleDiv = (mode && mode === "add" ? testDiv.find(".jsavnode").filter(".jsavhighlight"):testDiv.find(".jsavnode").not(".jsavhighlight"));
  	// TODO: general way to get styles for the whole av system
  	$("body").append(testDiv);
    this.css(indices, {color: styleDiv.css("color"), "background-color": styleDiv.css("background-color")});
    testDiv.remove();
  }
  
  arrproto.isHighlight = function(index, options) {
    var testDiv = $('<ol class="' + this.element[0].className + 
        '" style="position:absolute;left:-10000px">' + 
        '<li class="jsavnode jsavindex jsavhighlight"></li><li class="jsavnode jsavindex" ></li></li></ol>'),
  	  styleDiv = testDiv.find(".jsavnode").filter(".jsavhighlight");
  	// TODO: general way to get styles for the whole av system
  	$("body").append(testDiv);
  	var isHl = getIndices($(this.element).find("li"), index).css("background-color") == styleDiv.css("background-color");
  	testDiv.remove();
  	return isHl;
  };
  
  arrproto.highlight = function(indices, options) {
    setHighlight.call(this, indices, "add");
    return this; 
  };

  arrproto.unhighlight = function(indices, options) {
    setHighlight.call(this, indices, "remove");
    return this; 
  };
  arrproto._setcss = JSAV.anim(function(indices, cssprop) {
    var $elems = getIndices($(this.element).find("li"), indices);
    if (!this.jsav.RECORD && !$.fx.off) { // only animate when playing, not when recording
      // also animate the values due to a bug in webkit based browsers with inherited bg color not changing
      $elems.animate(cssprop, this.jsav.SPEED).find("span.jsavvalue").animate(cssprop, this.jsav.SPEED);
    } else {
      $elems.css(cssprop).find("span.jsavvalue").css(cssprop);
    }
    return this;
  });
  arrproto._setarraycss = JSAV.anim(function(cssprops) {
    var oldProps = $.extend(true, {}, cssprops),
        el = this.element;
    if (typeof cssprops !== "object") {
      return [cssprops];
    } else {
      for (var i in cssprops) {
        oldProps[i] = el.css(i);
      }
    }
    if (!this.jsav.RECORD || !$.fx.off) { // only animate when playing, not when recording
      this.element.animate(cssprops, this.jsav.SPEED);
    } else {
      this.element.css(cssprops);
    }
    return [oldProps];
  });
  arrproto.css = function(indices, cssprop) {
    var $elems = getIndices($(this.element).find("li"), indices);
    if (typeof cssprop === "string") {
      return $elems.css(cssprop);
    } else if (typeof indices === "string") {
      return this.element.css(indices);
    } else if (!$.isArray(indices) && typeof indices === "object") { // object, apply for array
      return this._setarraycss(indices);
    } else {
      if ($.isFunction(indices)) { // if indices is a function, evaluate it right away and get a list of indices
        var all_elems = $(this.element).find("li"),
          sel_indices = []; // array of selected indices
        for (var i = 0; i < $elems.size(); i++) {
          sel_indices.push(all_elems.index($elems[i]));
        }
        indices = sel_indices;
      }
      return this._setcss(indices, cssprop);
    }
  };
  function realSwap(index1, index2, options) {
    var $pi1 = $(this.element).find("li:eq(" + index1 + ")"), // index
      $pi2 = $(this.element).find("li:eq(" + index2 + ")");
    this.jsav.effects.swap($pi1, $pi2);
  }
  arrproto.swap = JSAV.anim(function(index1, index2, options) {
    realSwap.apply(this, arguments);
    return this; 
  }, realSwap
  );
  arrproto.clone = function() { 
    // fetch all values
    var size = this.size(),
      vals = [];
    for (var i=0; i < size; i++) {
      vals[i] = this.value(i);
    }
    return new AVArray(this.jsav, vals, $.extend(true, {}, this.options, {display: false})); 
  };
  arrproto.size = function() { return this.element.find("li").size(); };
  arrproto.value = function(index, newValue) {
    if (typeof newValue === "undefined") {
      var $index = this.element.find("li:eq(" + index + ")"),
          val = $index.attr("data-value"),
          valtype = $index.attr("data-value-type");
      if (valtype === "number") {
        return Number(val);
      } else if (valtype === "boolean") {
        if (typeof(val) === "boolean") {
          return val;
        } else if (typeof(val) === "string") {
          return val === "true";
        }
        return !!val;
      } else {
        return val;
      }
    } else {
      return this.setvalue(index, newValue);
    }
  };
  arrproto._newindex = function(value) {
    if (typeof value === "undefined") {
      value = "";
    }
    var ind = $("<li class='jsavnode jsavindex'><span class='jsavvalue'>" + value + "</span></li>"),
      valtype = typeof(value);
    if (valtype === "object") { valtype = "string"; }
    ind.attr("data-value", value).attr("data-value-type", valtype);
    return ind;
  };
  arrproto.setvalue = JSAV.anim(function(index, newValue) {
    var size = this.size();
    while (index > size - 1) {
      var newli = this._newindex();
      this.element.append(newli);
      size = this.size();
    }
    var $index = this.element.find("li:eq(" + index + ")"),
      valtype = typeof(newValue);
    if (valtype === "object") { valtype = "string"; }
    $index.attr("data-value", "" + newValue).attr("data-value-type", valtype);
    $index.find(".jsavvalue").html("" + newValue);
    this.layout();
  });
  arrproto.initialize = function(data) {
    var el = this.options.element || $("<ol/>"),
      liel, liels = $();
    el.addClass("jsavarray");
    this.options = jQuery.extend({display: true}, this.options);
    for (var key in this.options) {
      var val = this.options[key];
      if (this.options.hasOwnProperty(key) && typeof(val) === "string" 
          || typeof(val) === "number" || typeof(val) === "boolean") {
        el.attr("data-" + key, val);
      }
    }
    for (var i=0; i < data.length; i++) {
      liel = this._newindex(data[i]);
      liels = liels.add(liel);
    }
    el.append(liels);
    if (!this.options.element) {
      $(this.jsav.canvas).append(el);
    }
    this.element = el;
    this.layout();
    el.css("display", "hidden");
    var visible = (typeof this.options.display === "boolean" && this.options.display === true);
    if (visible) {
      if (this.jsav.currentStep() === 0) { // at beginning, just make it visible
        el.css("display", "block");
      } else { // add effect to show otherwise
        this.show();
      }
    }
  };
  arrproto.initializeFromElement = function() {
    if (!this.element) { return; }
    var $elem = this.element,
      $elems = $elem.find("li"),
      data = $elem.data();
    for (var key in data) {
      if (data.hasOwnProperty(key)) {
        this.options[key] = data[key];
      }
    }
    $elem.addClass("jsavarray");
    $elems.each(function(index, item) {
      var $this = $(this);
      if (!$this.attr("data-value")) {
        $this.attr("data-value", parseInt($this.html(), 10));
      }
      $this.addClass("jsavnode jsavindex").html("<span class='jsavvalue'>" + $this.html() + "</span>");     
    });
    this.layout();
  };
  arrproto.layout = function() {
    var layoutAlg = this.options.layout || "_default";
    this.element.removeClass("jsavbararray");
    this.jsav.ds.layout.array[layoutAlg](this);
  };
  arrproto.state = function(newstate) {
    if (newstate) {
      $(this.element).html(newstate.html);
    } else {
      var sta = {
        html: $(this.element).html()
      };
      return sta;
    }
  };
  arrproto.equals = function(otherArray, options) {
    var opts = options || {},
      i, j,
      equal,
      cssprop,
      len;
    if ($.isArray(otherArray)) { // simple case of array values
      if (!options) { // if nothing in options is specified
        len = otherArray.length;
        if (this.size() !== len) { // don't compare arrays of different size
          return false;
        }
        for (i = 0; i < len; i++) { // are the values equal
          equal = this.value(i) == otherArray[i];
          if (!equal) { return false; }
        }
        return true; // if tests passed, arrays are equal
      } else { // if options
        if ('css' in opts) { // if css property given, compare given array to property
          cssprop = opts.css;
          for (i = 0; i < len; i++) {
            equal = this.css(i, cssprop) == otherArray[i];
            if (!equal) { return false; }
          }
          return true; // if tests passed, arrays are equal
        }
      }
    } else { // JSAV array
      len = otherArray.size();
      if (this.size() !== len) { // size check
        return false;
      }
      if (!('value' in opts) || opts['value']) { // if comparing values
        for (i = 0; i < len; i++) {
          equal = this.value(i) == otherArray.value(i);
          if (!equal) { return false; }
        }
      }
      if ('css' in opts) { // if comparing css properties
        if ($.isArray(opts.css)) { // array of property names
          for (i = 0; i < opts.css.length; i++) {
            cssprop = opts.css[i];
            for (j = 0; j < len; j++) {
              equal = this.css(j, cssprop) == otherArray.css(j, cssprop);
              if (!equal) { return false; }
            }
          }
        } else { // if not array, expect it to be a property name string
          cssprop = opts.css;
          for (i = 0; i < len; i++) {
            equal = this.css(i, cssprop) == otherArray.css(i, cssprop);
            if (!equal) { return false; }
          }
        }
      }
      return true; // if tests passed, arrays are equal
    }
    
    // default: return false    
    return false;
  };
  arrproto.clear = function() {
    this.element.remove();
  };
  
  // events to register as functions on array
  var events = ["click", "dblclick", "mousedown", "mousemove", "mouseup", 
                "mouseenter", "mouseleave"];
  // returns a function for the passed eventType that binds a passed
  // function to that eventType for indices in the array
  var eventhandler = function(eventType) {
    return function(handler) {
      var self = this;
      this.element.on(eventType, ".jsavindex", function(e) {
        var index = self.element.find(".jsavindex").index(this);
        // bind this to the array and call handler
        // with params array index and the event
        handler.call(self, index, e); 
      });
      return this;
    }
  };
  // create the event binding functions and add to array prototype
  for (var i = events.length; i--; ) {
    arrproto[events[i]] = eventhandler(events[i]);
  }
 
  arrproto.toggleArrow = JSAV.anim(function(indices) {
    var $elems = getIndices($(this.element).find("li"), indices);
    $elems.toggleClass("jsavarrow");
  });
  arrproto.toggleLine = JSAV.anim(function(index, options) {
      // Toggles a marker line above a given array index for bar layout
      // Options that can be passed:
      //  - markStyle: style of the "ball" as an object of CSS property/value pairs.  
      //               Default style is first applied, then the given style. Passing
      //               null will disable the ball alltogether
      //  - lineStyle: style of the line, similarly to markStyle
      //  - startIndex: index in the array where the line will start. default 0
      //  - endIndex: index in the array where the line will end, inclusive. default 
      //              last index of the array
      if (this.options.layout !== "bar") { return; } // not bar layout
      var valelem = this.element.find("li .jsavvalue").eq(index),
          lielem = valelem.parent();
      if (valelem.size() === 0 ) { return; } // no such index
      var opts = $.extend({startIndex: 0, endIndex: this.size() - 1}, options);
      
      var $mark = lielem.find(".jsavmark"),
          $markline = lielem.find(".jsavmarkline");
      if ($markline.size() === 0 && $mark.size() === 0) { // no mark exists yet
        if (opts.markStyle !== null) { // mark is not disabled
          $mark = $("<div class='jsavmark' />");
          lielem.prepend($mark);
          if (opts.markStyle) { $mark.css(opts.markStyle); }
          $mark.css({ bottom: valelem.height() - $mark.outerHeight()/2, 
                      left: valelem.position().left + valelem.width() / 2 - $mark.outerWidth()/2,
                      display: "block"});
        }
        if (opts.lineStyle !== null) { // mark line not disabled
          $markline = $("<div class='jsavmarkline' />");
          lielem.prepend($markline);
          if (opts.lineStyle) { $markline.css(opts.lineStyle); }
          var startelem = this.element.find("li:eq(" + opts.startIndex + ")"),
              endelem = this.element.find("li:eq(" + opts.endIndex + ")");
          $markline.css({ width: endelem.position().left
                                  - startelem.position().left
                                  + endelem.width(),  
                          left:startelem.position().left - lielem.position().left,
                          bottom: valelem.height() - $markline.outerHeight()/2,
                          display: "block"});
        }
      } else { // mark exists already, remove them
        $mark.remove();
        $markline.remove();
      }
      return [index, opts];
    });




  JSAV._types.ds.AVArray = AVArray;
  // expose the data structures for the JSAV
  JSAV.ext.ds.array = function(element, options) {
      return new AVArray(this, element, options);
  };

})(jQuery);




/// array layout
(function($) {
  function centerArray(array, $lastItem) {
    // center the array inside its parent container
    if (array.options.hasOwnProperty("center") && !array.options.center) {
      // if options center is set to falsy value, return
      return;
    }
    // width of array expected to be last items position + its width
    var width = $lastItem.position().left + $lastItem.outerWidth(),
      containerWidth = $(array.jsav.canvas).width();
    array.element.css("left", (containerWidth - width)/2);
  }
  
  function horizontalArray(array) {
    var $arr = $(array.element).addClass("jsavhorizontalarray"),
      // rely on browser doing the calculation, float everything to the left..
      $items = $arr.find("li").css({"float": "left", "position":"static"}),
      maxHeight = -1,
      indexed = !!array.options.indexed;
    if (indexed) {
      $arr.addClass("jsavindexed");
    }
    $items.each(function(index, item) {
      var $i = $(this),
        pos = $i.position();
      $i.css({"left": pos.left - index, "top": pos.top});
      maxHeight = Math.max(maxHeight, $i.outerHeight());
      if (indexed) {
        var $indexLabel = $i.find(".jsavindexlabel");
        if ($indexLabel.size() === 0) {
          $i.append('<span class="jsavindexlabel">' + index + '</span>');
          $indexLabel = $i.find(".jsavindexlabel");
        }
      }
    });
    // ..and return float and positioning
    $items.css({"float": "none", "position": "absolute"});
    $arr.height(maxHeight + (indexed?30:0));
    centerArray(array, $items.last());
  }
  
  function verticalArray(array) {
    var $arr = $(array.element).addClass("jsavverticalarray"),
      $items = $arr.find("li"),
      maxWidth = -1,
      indexed = !!array.options.indexed;
    if (indexed) {
      $arr.addClass("jsavindexed");
      $items.each(function(index, item) {
        var $i = $(this);
        var $indexLabel = $i.find(".jsavindexlabel");
        if ($indexLabel.size() === 0) {
          $i.append('<span class="jsavindexlabel">' + index + '</span>');
          $indexLabel = $i.find(".jsavindexlabel");
        }
        maxWidth = Math.max(maxWidth, $indexLabel.innerWidth());
        $indexLabel.css({
          left: -15 - $i.outerWidth() / 2,
          top: $i.innerHeight() / 2 - $indexLabel.outerHeight() / 2
        })
      });
      $items.css("margin-left", maxWidth);
    }
    centerArray(array, $items.last());
  }
 
  function barArray(array) {
    var $arr = $(array.element).addClass("jsavbararray"),
      $items = $arr.find("li").css({"position":"relative", "float": "left"}), 
      maxValue = Number.MIN_VALUE,
      indexed = !!array.options.indexed,
      width = $items.first().outerWidth();
      size = array.size();
    if (indexed) {
      $arr.addClass("jsavindexed");
    }
    for (var i = 0; i < size; i++) {
      maxValue = Math.max(maxValue, array.value(i));
    }
    maxValue *= 1.15;
    $items.each(function(index, item) {
      var $i = $(this);
      var $valueBar = $i.find(".jsavvaluebar");
      if ($valueBar.size() === 0) {
        $i.prepend('<span class="jsavvaluebar" />');
        $valueBar = $i.find(".jsavvaluebar");
      }
      $valueBar.css({"height": "100%"});
      $i.find(".jsavvalue").css("height", (100.0*array.value(index) / maxValue) + 15 + "%")
        .html('<span>' + $i.find(".jsavvalue").text() + '</span>');
      if (indexed) {
        var $indexLabel = $i.find(".jsavindexlabel");
        if ($indexLabel.size() === 0) {
          $i.append('<span class="jsavindexlabel">' + index + '</span>');
          $indexLabel = $i.find(".jsavindexlabel");
        }
      }
    });
    centerArray(array, $items.last());
  }
  
    JSAV.ext.ds.layout.array = {
    "_default": horizontalArray,
    "bar": barArray,
    "array": horizontalArray,
    "vertical": verticalArray
  };

})(jQuery);