package com.altroo.muinativehost

fun main() {
  val a = PortalObservationRect(10.5,20.25,100.0,80.0)
  check(a.intersect(PortalObservationRect(0.0,0.0,200.0,200.0)) == a)
  check(a.intersect(PortalObservationRect(30.0,40.0,100.0,100.0)) == PortalObservationRect(30.0,40.0,80.5,60.25))
  val outside = PortalObservationRect(200.0,300.0,20.0,40.0)
  check(a.intersect(outside) == PortalObservationRect(200.0,300.0,-89.5,-199.75))
  check(a.intersect(outside) == outside.intersect(a))
  val signed = a.intersect(outside)
  check(signed.intersect(PortalObservationRect(0.0,0.0,500.0,500.0)) == signed)
  check(a.intersect(PortalObservationRect(110.5,100.25,20.0,40.0)) == PortalObservationRect(110.5,100.25,0.0,0.0))
  check(a.scale(2.0) == PortalObservationRect(5.25,10.125,50.0,40.0))
  check(signed.scale(2.0) == PortalObservationRect(100.0,150.0,-44.75,-99.875))
  val rotate: (Double,Double) -> Pair<Double,Double> = { x,y -> Pair(100.0+(x-y)*0.5,200.0+(x+y)*0.5) }
  check(portalObservedBounds(0.0,0.0,0.0,80.0,true,rotate) == PortalObservationRect(100.0,200.0,0.0,0.0))
  check(portalObservedBounds(0.0,0.0,80.0,0.0,true,rotate) == PortalObservationRect(100.0,200.0,0.0,0.0))
  check(portalObservedBounds(20.0,10.0,10.0,80.0,true,rotate) == PortalObservationRect(105.0,215.0,0.0,0.0))
  check(portalObservedBounds(0.0,0.0,0.0,80.0,false,rotate) == PortalObservationRect(60.0,200.0,40.0,40.0))
  check(portalObservedBounds(0.0,0.0,80.0,40.0,true,rotate) == PortalObservationRect(80.0,200.0,60.0,60.0))
  println("13 native observation geometry assertions passed")
}
