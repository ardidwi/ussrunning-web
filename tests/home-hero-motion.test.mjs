import test from "node:test";
import assert from "node:assert/strict";
import { loader } from "./frontend-loader.mjs";
const { heroMotionPose, smoothRange, motionEase } = loader()("components/home/hero-motion.ts");

test("smooth ranges clamp both endpoints", () => {
  assert.equal(smoothRange(.1, .5, -2), 0);
  assert.equal(smoothRange(.1, .5, 4), 1);
});
test("smooth ranges ease into and out of holds", () => {
  assert.ok(smoothRange(0, 1, .001) < .00001);
  assert.ok(1 - smoothRange(0, 1, .999) < .00001);
});
test("opening keeps its full orbital mark", () => {
  const pose = heroMotionPose(0, false);
  assert.equal(pose.orbitOpacity, 1);
  assert.equal(pose.orbitScale, 1);
  assert.equal(pose.monasOpacity, 0);
});
test("route and orbit overlap during the handoff", () => {
  const pose = heroMotionPose(.28, false);
  assert.ok(pose.orbitOpacity > 0 && pose.orbitOpacity < 1);
  assert.ok(pose.routeOpacity > 0);
  assert.ok(pose.routeFlatten > 0);
});
test("Monas arrives progressively before the architectural hold", () => {
  assert.ok(heroMotionPose(.48, false).monasOpacity > heroMotionPose(.4, false).monasOpacity);
});
test("the readable Monas hold stays stable", () => {
  assert.equal(heroMotionPose(.55, false).monasOpacity, .8);
  assert.equal(heroMotionPose(.7, false).monasOpacity, .8);
});
test("Monas remains visible during its outgoing transition", () => {
  const opacity = heroMotionPose(.8, false).monasOpacity;
  assert.ok(opacity > 0 && opacity < .8);
});
test("final brand pose clears prior layers", () => {
  const pose = heroMotionPose(1, false);
  assert.equal(pose.orbitOpacity, 0);
  assert.equal(pose.monasOpacity, 0);
  assert.equal(pose.routeOpacity, 0);
});
test("old chapter boundaries cannot snap the art pose", () => {
  for (const boundary of [.25, .5, .75]) {
    const before = heroMotionPose(boundary - .0001, false);
    const after = heroMotionPose(boundary + .0001, false);
    for (const key of Object.keys(before)) assert.ok(Math.abs(after[key] - before[key]) < .01);
  }
});
test("orbit retreats monotonically without overshooting", () => {
  let previous = 1;
  for (let i = 0; i <= 100; i++) {
    const pose = heroMotionPose(i / 100, false);
    assert.ok(pose.orbitScale >= .78 && pose.orbitScale <= 1);
    assert.ok(pose.orbitOpacity <= previous);
    previous = pose.orbitOpacity;
  }
});
test("reduced motion retains the narrative without spatial recession", () => {
  for (const progress of [0,.25,.5,.75,1]) {
    const pose = heroMotionPose(progress, true);
    assert.equal(pose.orbitScale, 1);
    assert.equal(pose.routeFlatten, 0);
    assert.equal(pose.monasOpacity, heroMotionPose(progress, false).monasOpacity);
  }
});
test("interpolation is equivalent across refresh rates", () => {
  const half = motionEase(32);
  assert.ok(Math.abs((1 - (1 - half) ** 2) - motionEase(64)) < 1e-12);
});
test("resume gaps are bounded and negative deltas do not reverse movement", () => {
  assert.equal(motionEase(2000), motionEase(64));
  assert.equal(motionEase(-10), 0);
});
test("reverse scrolling returns the same deterministic pose", () => {
  const original = heroMotionPose(.28, false);
  heroMotionPose(.8, false);
  assert.deepEqual(heroMotionPose(.28, false), original);
});
