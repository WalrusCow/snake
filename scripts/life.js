define(['util'], function (util) {
  // Defaults
  var lifeDefaults = {
    cellSize : 10,
    cellFill : '#87AFC7',
    cellBorder : '25383C',
    cellBorderSize : 1,
    controlSelector : 'Life-'
  };

  function Life(options) {
    /* Encapsulate a single Life game */

    options = options || {};
    this.options = util.extend(lifeDefaults, options);

    // Set controls and event listeners
    this._initControls();

    // Save the size of the grid
    this.gridSize = {
      x : Math.floor(this.canvasControl.width / this.options.cellSize),
      y : Math.floor(this.canvasControl.height / this.options.cellSize)
    };

    // Build game grid
    this.gameGrid = this._makeGrid();

  }

  Life.prototype._initControls = function() {
    /* Initialize handlers and etc. */
    var self = this;
    var controls = [
      { id : 'start', handler : this.start, event : 'click' },
      { id : 'stop', handler : this.stop, event : 'click' },
      { id : 'clear', handler : this.clear, event : 'click' },
      { id : 'speed', handler : this.updateFps, event : 'change' },
      { id : 'canvas', handler : this.click, event : 'mousedown' }
    ];

    // Create an event handler. Take function and what `this` should be
    function makeHandler(f, t) {
      return function(e) { f.apply(t, arguments); e.preventDefault(); };
    }

    util.each(controls, function(control) {
      var id = self.options.controlSelector + control.id;
      var el = document.getElementById(id);
      // Set control elements
      self[control.id + 'Control'] = el;
      // Set event listener
      el.addEventListener(control.event, makeHandler(control.handler, self));
    });

    this.ctx = this.canvasControl.getContext('2d');

  };

  Life.prototype.pixelsToCoords = function(x, y) {
    return {
      x : Math.floor(x / this.options.cellSize),
      y : Math.floor(y / this.options.cellSize)
    };
  };

  Life.prototype.coordsToPixels = function(x, y) {
    /* Get actual canvas coords for a life grid point */
    return {
      x : this.options.cellSize * x,
      y : this.options.cellSize * y
    };
  }

  Life.prototype.click = function(e) {
    var x = e.x - this.canvasControl.offsetLeft;
    var y = e.y - this.canvasControl.offsetTop;

    // Account for the border
    var re = /px$/;
    var canvasStyle = getComputedStyle(this.canvasControl);
    x -= canvasStyle.getPropertyValue('border-left-width').replace(re, '');
    y -= canvasStyle.getPropertyValue('border-top-width').replace(re, '');

    // Invalid click
    if(x < 0 || y < 0) return;

    var coords = this.pixelsToCoords(x, y);
    var cell = this.gameGrid[coords.x][coords.y];

    // Flip the alive state
    cell.alive = !cell.alive;

    // Draw or clear as appropriate
    cell.alive ? this.drawCell(coords.x, coords.y) : this.clearCell(coords.x, coords.y);

  };

  Life.prototype._makeGrid = function() {
    /* Generate a new grid of size (x, y) */

    var gameGrid = [];
    for(var i = 0; i < this.gridSize.x; ++i) {
      gameGrid[i] = [];
      for(var j = 0; j < this.gridSize.y; ++j) {
        gameGrid[i][j] = { neighbours : 0, alive : false };
      }
    }
    return gameGrid;
  };

  Life.prototype.clear = function() {
    /* Clear the board */
    for(var i = 0; i < this.gameGrid.length; ++i) {
      for(var j = 0; j < this.gameGrid[i].length; ++j) {
        this.gameGrid[i][j].alive = false;
        this.gameGrid[i][j].neighbours = 0;
      }
    }
    this.ctx.clearRect(0, 0, this.canvasControl.width, this.canvasControl.height);
  };

  Life.prototype.stop = function() {
    /* Stop the game. */
    if(this.started) {
      this._stopTimer();
      this.started = false;
    }
  };

  Life.prototype.start = function() {
    /* Start the game. */

    // If not started, update the FPS, which starts the game
    if(!this.started) {
      this._startTimer();
      this.started = true;
    }
  };

  Life.prototype._stopTimer = function() {
    window.clearInterval(this.interval);
    delete this.interval;
  };

  Life.prototype._startTimer = function() {
    var fps = this.speedControl.value;
    // Milliseconds in between ticks
    var ms = Math.floor(1000 / fps);
    this.interval = window.setInterval(this._tick.bind(this), ms);
  };

  Life.prototype.updateFps = function() {
    if(!this.started) return;
    this._stopTimer();
    this._startTimer();
  };

  Life.prototype._tick = function() {
    // Count the neighbours of each
    for(var x = 0; x < this.gridSize.x; ++x) {
      for(var y = 0; y < this.gridSize.y; ++y) {
        this._countNeighbours(x, y);
      }
    }

    // Check each to see if alive and reset the neighbours count
    for(var x = 0; x < this.gridSize.x; ++x) {
      for(var y = 0; y < this.gridSize.y; ++y) {
        cell = this.gameGrid[x][y];

        if(cell.alive) {
          // Live if neighbours are 2 or 3, die otherwise
          cell.alive = (cell.neighbours === 2 || cell.neighbours === 3);
        } else {
          // Become alive if exactly 3 neighbours
          cell.alive = (cell.neighbours === 3);
        }

        cell.neighbours = 0;

        // Draw or clear the cell
        cell.alive ? this.drawCell(x, y) : this.clearCell(x, y);
      }
    }
  }

  Life.prototype.drawCell = function(x, y) {
    /* Draw the cell at position (x, y) */
    var coords = this.coordsToPixels(x, y);
    var cellSize = this.options.cellSize;

    util.drawSquare(this.ctx, coords, cellSize, this.options.cellBorder);

    // Border size
    var bs = this.options.cellBorderSize;
    // Move up+left by border size
    coords.x += bs;
    coords.y += bs;

    // Reduce size by twice border size so border appears on all sides
    cellSize -= 2 * bs;
    util.drawSquare(this.ctx, coords, cellSize, this.options.cellFill);
  };

  Life.prototype.clearCell = function(x, y) {
    /* Undraw cell at position (x, y) */
    var coords = this.coordsToPixels(x, y);
    util.clearSquare(this.ctx, coords, this.options.cellSize);
  };

  Life.prototype._getNeighbours = function(x, y) {
    /* Return array of neighbouring cells to cell at (x, y) */

    var width = this.gridSize.x;
    var height = this.gridSize.y;

    var neighbours = [];

    // i, j are offsets from x, y.  Make sure to not go out of bounds
    for(var i = (x && -1); i <= ((width-x-1) && 1); ++i) {
      for(var j = (y && -1); j <= ((height-y-1) && 1); ++j) {
        // A cell is not its own neighbour
        if(i || j) neighbours.push(this.gameGrid[x + i][y + j]);
      }
    }

    return neighbours;
  };

  Life.prototype._countNeighbours = function(x, y) {
    /*
     * Add 1 to the number of neighbours of each neighbour
     * of cell (x, y) if cell (x, y) is alive.
     */

    // Add to neighbours only if alive
    if(!this.gameGrid[x][y].alive) return;

    // Don't go out of bounds
    var neighbours = this._getNeighbours(x, y);
    for(var i = 0; i < neighbours.length; ++i) {
      neighbours[i].neighbours += 1;
    }
  };

  return Life;

});
