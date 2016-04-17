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
    let r = Math.round(Math.max(this.r, 0))
    let g = Math.round(Math.max(this.g, 0))
    let b = Math.round(Math.max(this.b, 0))
    return `rgba(${r}, ${g}, ${b}, ${Math.max(this.a, 0)})`
  }
}

const CellTypes = {
  air: new Color(0, 0, 0, 0),
  red: new Color(170, 0, 0, 1),
  green: new Color(0, 170, 0, 1),
  blue: new Color(0, 0, 170, 1),
  orange: new Color(218, 135, 48, 1),
  yellow: new Color(244, 252, 78, 1)
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
    this.turnSensitivity = Math.PI / 90
    this.moveSensitivity = 0.1
    this.miniMapPos = new Point(20, 20)
    this.wallHeight = 25

    this['Turn Speed'] = 1; this['Move Speed'] = 1; this['Wall Height'] = 1
    this.gui = new dat.GUI()
    this.gui.add(this, 'FOV', 0.25, 1)
    this.gui.add(this, 'Turn Speed', 0.5, 4).onChange((value) => this.turnSensitivity = Math.PI / 180 * value)
    this.gui.add(this, 'Move Speed', 0.5, 4).onChange((value) => this.moveSensitivity = 0.1 * value)
    this.gui.add(this, 'Wall Height', 0.1, 1.5).onChange((value) => this.moveSensitivity = 50 * value)

    this.player = new Player(0, 1.5, 1.5)
    this.map = new Map(map)

    this.maxDist = Math.sqrt(Math.pow(this.map.length, 2) + Math.pow(this.map[0].length, 2))

    document.addEventListener('keypress', event => this.handleKeyboardInput(event))
  }

  handleKeyboardInput(event) {
    // console.log(event.which);
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
    }
  }

  update() {

  }

  render() {
    requestAnimationFrame(() => this.render())

    if (!this.running) return;

    this.ctx.fillStyle = '#aaaaaa'
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)

    this.rays = []
    this.castRays()
    this.drawMiniMap()
  }

  scaleAngle(theta) {
    let ratio = this.canvas.width / (this.FOV * Math.PI)
    return (theta - this.player.theta) * ratio
  }

  castRays() {
    // cast all rays
    let lineWidth = this.canvas.width / (this.FOV * Math.PI / 0.006)

    for (let theta = this.player.theta; theta < this.player.theta + this.FOV * Math.PI; theta += 0.005) {
      let ray = new Ray(theta, this.player.pos.x, this.player.pos.y)
      this.rays.push(ray)

      let currentCell; // declare here for scope purposes
      do {
        let pos = ray.nextCell()
        currentCell = this.map[Math.round(pos.y)][Math.round(pos.x)]
        let heightRatio = (this.maxDist - this.player.pos.dist(pos)) / this.canvas.height
        let height = heightRatio * (this.canvas.height) * this.wallHeight

        this.ctx.fillStyle = currentCell.darken(this.player.pos.dist(pos) / this.maxDist * 1.1).toString()
        this.ctx.fillRect(
          this.scaleAngle(theta) - lineWidth / 2,
          (this.canvas.height / 2) - height,
          lineWidth,
          height * 2
        )
      } while (currentCell.a < 1)
    }
  }

  drawMiniMap() {
    let [posX, posY] = [this.miniMapPos.x, this.miniMapPos.y]
    let tileWidth = 15

    this.ctx.fillStyle = '#ffffff'
    this.ctx.fillRect(
      posX - (tileWidth / 2),
      posY - (tileWidth / 2),
      (this.map.length * tileWidth) + tileWidth,
      (this.map[0].length * tileWidth) + tileWidth
    )

    for (let y in this.map) {
      for (let x in this.map[y]) {
        this.ctx.fillStyle = this.map[y][x].toString()
        this.ctx.fillRect(x * tileWidth + posX, y * tileWidth + posY, tileWidth, tileWidth)
      }
    }

    this.ctx.strokeStyle = 'rgba(0, 0, 0, 1)'
    this.ctx.beginPath()
    this.ctx.arc(
      this.player.pos.x * tileWidth + posX,
      this.player.pos.y * tileWidth + posY,
      tileWidth / 2, 0, 2 * Math.PI
    )
    this.ctx.stroke()

    this.ctx.strokeStyle = 'rgba(126, 126, 126, 0.1)'
    for(let i in this.rays) {
      this.ctx.beginPath()
      this.ctx.moveTo(this.player.pos.x * tileWidth + posX, this.player.pos.y * tileWidth + posY)
      this.ctx.lineTo(this.rays[i].pos.x * tileWidth + (tileWidth/2) + posX, this.rays[i].pos.y * tileWidth + (tileWidth/2) + posY)
      this.ctx.stroke()
    }
  }
}

let world = new RayCaster(map)

;(function () {
  setInterval(() => world.update(), 16) // update loop
  requestAnimationFrame(() => world.render()) // render loop
})()
