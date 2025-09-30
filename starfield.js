"use strict";

window.onload = function () {
  setTimeout(start, 200);
};

function start() {

  /* ---------------------  Helpers --------------------- */
  function lineToAngle(x1, y1, length, radians) {
    return {
      x: x1 + length * Math.cos(radians),
      y: y1 + length * Math.sin(radians)
    };
  }

  function randomRange(min, max) {
    return min + Math.random() * (max - min);
  }

  function degreesToRads(degrees) {
    return degrees / 180 * Math.PI;
  }

  /* ---------------------  Particle --------------------- */
  const particle = {
    x: 0, y: 0,
    vx: 0, vy: 0,
    radius: 0,

    create(x, y, speed, direction) {
      const p = Object.create(this);
      p.x = x;
      p.y = y;
      p.vx = Math.cos(direction) * speed;
      p.vy = Math.sin(direction) * speed;
      return p;
    },

    getSpeed() {
      return Math.hypot(this.vx, this.vy);
    },

    setSpeed(speed) {
      const heading = this.getHeading();
      this.vx = Math.cos(heading) * speed;
      this.vy = Math.sin(heading) * speed;
    },

    getHeading() {
      return Math.atan2(this.vy, this.vx);
    },

    setHeading(heading) {
      const speed = this.getSpeed();
      this.vx = Math.cos(heading) * speed;
      this.vy = Math.sin(heading) * speed;
    },

    update() {
      this.x += this.vx;
      this.y += this.vy;
    }
  };

  /* ---------------------  Canvas --------------------- */
  const canvas = document.getElementById("canvas");
  const context = canvas.getContext("2d");

  let width, height;
  function resizeCanvas() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  }
  window.addEventListener("resize", resizeCanvas);
  resizeCanvas(); // initial size

  /* ---------------------  Settings --------------------- */
  const layers = [
    { speed: 0.015, scale: 0.2, count: 320 },
    { speed: 0.03,  scale: 0.5, count: 50  },
    { speed: 0.05,  scale: 0.75,count: 30  }
  ];
  const starsAngle = 145;
  const shootingStarSpeed = { min: 15, max: 20 };
  const shootingStarOpacityDelta = 0.01;
  const trailLengthDelta = 0.01;
  const shootingStarEmittingInterval = 2000;
  const shootingStarLifeTime = 500;
  const maxTrailLength = 300;
  const starBaseRadius = 2;
  const shootingStarRadius = 3;

  const stars = [];
  const shootingStars = [];
  let paused = false;

  /* ---------------------  Create stars --------------------- */
  for (let layer of layers) {
    for (let i = 0; i < layer.count; i++) {
      const star = particle.create(
        randomRange(0, width),
        randomRange(0, height),
        0, 0
      );
      star.radius = starBaseRadius * layer.scale;
      star.setSpeed(layer.speed);
      star.setHeading(degreesToRads(starsAngle));
      stars.push(star);
    }
  }

  /* ---------------------  Shooting stars --------------------- */
  function createShootingStar() {
    const s = particle.create(
      randomRange(width / 2, width),
      randomRange(0, height / 2),
      0, 0
    );
    s.setSpeed(randomRange(shootingStarSpeed.min, shootingStarSpeed.max));
    s.setHeading(degreesToRads(starsAngle));
    s.radius = shootingStarRadius;
    s.opacity = 0;
    s.trailLengthDelta = 0;
    s.isSpawning = true;
    s.isDying = false;
    shootingStars.push(s);
  }

  function killShootingStar(s) {
    setTimeout(() => { s.isDying = true; }, shootingStarLifeTime);
  }

  /* ---------------------  Draw functions --------------------- */
  function drawStar(star) {
    context.fillStyle = "rgb(255,221,157)";
    context.beginPath();
    context.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
    context.fill();
  }

  function drawShootingStar(p) {
    const x = p.x, y = p.y;
    const currentTrailLength = maxTrailLength * p.trailLengthDelta;
    const pos = lineToAngle(x, y, -currentTrailLength, p.getHeading());

    // star shape
    context.fillStyle = `rgba(255,255,255,${p.opacity})`;
    const starLength = 5;
    context.beginPath();
    context.moveTo(x - 1, y + 1);
    context.lineTo(x, y + starLength);
    context.lineTo(x + 1, y + 1);
    context.lineTo(x + starLength, y);
    context.lineTo(x + 1, y - 1);
    context.lineTo(x, y - starLength);
    context.lineTo(x - 1, y - 1);
    context.lineTo(x - starLength, y);
    context.closePath();
    context.fill();

    // trail
    context.fillStyle = `rgba(255,221,157,${p.opacity})`;
    context.beginPath();
    context.moveTo(x - 1, y - 1);
    context.lineTo(pos.x, pos.y);
    context.lineTo(x + 1, y + 1);
    context.closePath();
    context.fill();
  }

  /* ---------------------  Update loop --------------------- */
  function update() {
    if (!paused) {
      context.clearRect(0, 0, width, height);
      context.fillStyle = "#000";          // background to match body
      context.fillRect(0, 0, width, height);

      // stars
      for (let star of stars) {
        star.update();
        drawStar(star);
        if (star.x > width)  star.x = 0;
        if (star.x < 0)      star.x = width;
        if (star.y > height) star.y = 0;
        if (star.y < 0)      star.y = height;
      }

      // shooting stars
      for (let s of shootingStars) {
        if (s.isSpawning) {
          s.opacity += shootingStarOpacityDelta;
          if (s.opacity >= 1.0) {
            s.isSpawning = false;
            killShootingStar(s);
          }
        }
        if (s.isDying) {
          s.opacity -= shootingStarOpacityDelta;
          if (s.opacity <= 0) {
            s.isDying = false;
            s.isDead = true;
          }
        }
        s.trailLengthDelta += trailLengthDelta;
        s.update();
        if (s.opacity > 0) drawShootingStar(s);
      }

      // remove dead shooting stars
      for (let i = shootingStars.length - 1; i >= 0; i--) {
        if (shootingStars[i].isDead) shootingStars.splice(i, 1);
      }
    }
    requestAnimationFrame(update);
  }

  update();
  setInterval(() => { if (!paused) createShootingStar(); }, shootingStarEmittingInterval);

  window.onfocus = () => paused = false;
  window.onblur  = () => paused = true;
}
