'use strict'

class Color {
  constructor(r, g, b, a) {
    this.r = r
    this.g = g
    this.b = b
    this.a = a
  }

  darken(percent) {
    return new Color(
      this.r - 255 * percent,
      this.g - 255 * percent,
      this.b - 255 * percent,
      this.a
    )
  }

  toString() {
    return `rgba(${this.r}, ${this.g}, ${this.b}, ${this.a})`
  }
}

const CellTypes = {
  air: 'rgba(0, 0, 0, 0)',
  red: 'rgba(170, 0, 0, 1)',
  green: 'rgba(0, 170, 0, 1)',
  blue: 'rgba(0, 0, 170, 1)',
  orange: 'rgba(218, 135, 48, 1)',
  yellow: 'rgba(244, 252, 78, 1)'
}

const map = [
  [CellTypes.red, CellTypes.red, CellTypes.yellow, CellTypes.red,   CellTypes.yellow,    CellTypes.red, CellTypes.yellow, CellTypes.red],
  [CellTypes.yellow, CellTypes.air, CellTypes.air, CellTypes.air,   CellTypes.air,    CellTypes.air, CellTypes.air, CellTypes.red],
  [CellTypes.red, CellTypes.air, CellTypes.air, CellTypes.air,   CellTypes.air,    CellTypes.air, CellTypes.air, CellTypes.yellow],
  [CellTypes.yellow, CellTypes.air, CellTypes.air, CellTypes.blue,  CellTypes.yellow, CellTypes.air, CellTypes.air, CellTypes.red],
  [CellTypes.red, CellTypes.air, CellTypes.air, CellTypes.green, CellTypes.orange, CellTypes.air, CellTypes.air, CellTypes.yellow],
  [CellTypes.yellow, CellTypes.air, CellTypes.air, CellTypes.air,   CellTypes.air,    CellTypes.air, CellTypes.air, CellTypes.red],
  [CellTypes.red, CellTypes.air, CellTypes.air, CellTypes.air,   CellTypes.air,    CellTypes.air, CellTypes.air, CellTypes.yellow],
  [CellTypes.red, CellTypes.yellow, CellTypes.red, CellTypes.yellow,   CellTypes.red,    CellTypes.yellow, CellTypes.red, CellTypes.red],
]

class Point {
  constructor(x = 0, y = 0) {
    this.x = x
    this.y = y
  }

  copy() {
    return new Point(this.x, this.y)
  }

  dist(other) {
    let x = Math.pow((this.x - other.x), 2)
    let y = Math.pow((this.y - other.y), 2)
    return Math.sqrt(x + y)
  }
}

class Ray {
  constructor(theta, x, y) {
    this.pos = new Point(x, y)
    this.theta = theta
  }

  nextCell() {
    let prevPos = this.pos.copy()
    let i = 0
    while(true) { // this will loop until it returns a value
      this.pos.x += Math.cos(this.theta) * 0.01
      this.pos.y += Math.sin(this.theta) * 0.01

      if (Math.round(this.pos.x) !== Math.round(prevPos.x) ||
          Math.round(this.pos.y) !== Math.round(prevPos.y)) // weird indentation
      {
        return this.pos.copy()
      }
    }
  }
}

class Player {
  constructor(theta = 0, x = 0, y = 0, vx = 0, vy = 0, ax = 0, ay = 0) {
    this.theta = theta
    this.pos = new Point(x, y)
    this.vel = new Point(vx, vy)
    this.acc = new Point(ax, ay)
  }

  moveTo(x, y) {
    this.x = x
    this.y = y
  }
}

class Map extends Array {
  constructor(map) {
    super(...map)
  }
}

class RayCaster {
  constructor(map) {
    this.canvas = document.getElementById('c')
    this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight
    this.ctx = this.canvas.getContext('2d')
    this.FOV = 0.75 // field of view
    this.running = true
    this.turnSensitivity = Math.PI / 180
    this.moveSensitivity = 0.1

    this.player = new Player(0, 1.5, 1.5)
    this.map = new Map(map)

    document.addEventListener('keypress', event => this.handleKeyboardInput(event))
  }

  handleKeyboardInput(event) {
    console.log(event.which);
    let facing = this.player.theta + (this.FOV * Math.PI / 2)
    switch (event.which) {
      case 100:
        this.player.theta += this.turnSensitivity
        break;
      case 97:
        this.player.theta -= this.turnSensitivity
        break;
      case 119:
        this.player.pos.x += Math.cos(facing) * this.moveSensitivity
        this.player.pos.y += Math.sin(facing) * this.moveSensitivity
        break;
      case 115:
        this.player.pos.x -= Math.cos(facing) * this.moveSensitivity
        this.player.pos.y -= Math.sin(facing) * this.moveSensitivity
        break;
      // default:

    }
  }

  update() {
    // this.player.theta += Math.PI / (360 * 2)
  }

  render() {
    requestAnimationFrame(() => this.render())

    if (!this.running) return;

    this.ctx.fillStyle = '#aaaaaa'
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)

    this.drawMiniMap()
    this.castRays()
  }

  scaleAngle(theta) {
    let ratio = this.canvas.width / (this.FOV * Math.PI)
    return (theta - this.player.theta) * ratio
  }

  castRays() {
    // cast all rays
    let lineWidth = this.canvas.width / (this.FOV * Math.PI / 0.006)

    for (let theta = this.player.theta; theta < this.player.theta + this.FOV * Math.PI; theta += 0.005) {
      // console.log('theta', theta);
      let ray = new Ray(theta, this.player.pos.x, this.player.pos.y)

      let currentCell; // declare here for scope purposes
      do {
        let pos = ray.nextCell()
        currentCell = this.map[Math.round(pos.y)][Math.round(pos.x)]
        this.ctx.fillStyle = currentCell

        let heightRatio = (8 - this.player.pos.dist(pos)) / this.canvas.height
        let height = heightRatio * (this.canvas.height) * 10
        // console.log(height);
        let y0 = (this.canvas.height / 2) - height
        // let y1 = (this.canvas.height / 2) +

        this.ctx.fillRect(this.scaleAngle(theta) - lineWidth / 2, y0, lineWidth, height * 2)

      } while (parseInt(currentCell[currentCell.length-2]) < 1)
    }
  }

  drawMiniMap() {
    let [posX, posY] = [this.miniMapPos.x, this.miniMapPos.y]
    let tileWidth = 15

    this.ctx.fillStyle = 'white'
    this.ctx.fillRect()

    for (let y in this.map) {
      for (let x in this.map[y]) {
        this.ctx.fillStyle = this.map[y][x]
        this.ctx.fillRect(x * tileWidth + posX, y * tileWidth + posY, tileWidth, tileWidth)
      }
    }
  }
}

let world = new RayCaster(map)

;(function () {
  setInterval(() => world.update(), 16) // update loop
  requestAnimationFrame(() => world.render()) // render loop
})()
