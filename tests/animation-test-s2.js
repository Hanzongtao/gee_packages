/**** Start of imports. If edited, may not auto-convert in the playground. ****/
var point = /* color: #d63000 */ee.Geometry.Point([113.29888310808013, 23.097773911182657]),
    imageCollection = ee.ImageCollection("NOAA/CDR/AVHRR/LAI_FAPAR/V4"),
    imageCollection2 = ee.ImageCollection("NOAA/CDR/AVHRR/LAI_FAPAR/V5");
/***** End of imports. If edited, may not auto-convert in the playground. *****/
print(imageCollection2.limit(5))
/*
Copyright (c) 2018 Gennadii Donchyts. All rights reserved.

This work is licensed under the terms of the MIT license.  
For a copy, see <https://opensource.org/licenses/MIT>.
*/

var animation = require('users/gena/packages:animation')
var assets = require('users/gena/packages:assets')
var palettes = require('users/gena/packages:colorbrewer').Palettes

var bounds = ee.Geometry(Map.getBounds(true))
var bounds = point;
// get images from one or multiple missions
var images = assets.getImages(bounds, {
  //filter: ee.Filter.date("1985-01-01", "1995-01-01"),
  //filter: ee.Filter.date("2016-01-01", "2020-01-01"),
  // filter: ee.Filter.date("2018-01-01", "2020-01-01"),
  
  //filter: ee.Filter.date("2015-01-01", "2020-01-01"),
  //filter: ee.Filter.date("2000-01-01", "2020-01-01"),
  //filter: ee.Filter.date("2002-01-01", "2007-01-01"),
  filter: ee.Filter.date("2020-05-01", "2020-06-01"),
  //filter: ee.Filter.date("2015-01-01", "2019-02-01"),
  resample: true,
  //filterMasked: true,
  missions: [
    'S2', 
    //'L8', 
   // 'L7',
    // 'L5',
    // 'L4'
  ]
})

print('Count: ', images.size())

// images = images.map(function(i) { 
//   return i.visualize({bands:['swir','nir','red'], gamma: 2, min: 0.07})
//     .set({ label: i.date().format('YYYY-MM-dd') })
// })
//animation.animate(images, {label: 'label', maxFrames: 300})  

if(0) {
  // filter out noisy images
  images = assets.getMostlyCleanImages(images, bounds, {
      scale: Map.getScale() * 10, 
      
      // how much should we deviate from cloud frequency when filtering images, use negative value to allow more (cloudy) images
      cloudFrequencyThresholdDelta: 0.25,
  
      // percentile and band used for cloudness, usually enough to choose one like green    
      scorePercentile: 95,
      qualityBand: 'green',
    })
  
  print('Count: ', images.size())
  
  // images = images.filterDate('2018-12-31', '2020-01-01')
}

// images = ee.FeatureCollection(images).randomColumn('random').filter(ee.Filter.gt('random', 0.9))
// images = ee.ImageCollection(images)

// print('Count (random filtered): ', images.size())

images = images
  .sort('system:time_start')
  //.sort('quality')


images = images
  .map(function(i) {
    var image = i
    //var image = images.filterDate(i.date(), i.date().advance(-1, 'month')).mosaic()
    
    var s = Map.getScale()
    var r = s * 4
    var σ = s * 2
    // image = image.subtract(image.convolve(ee.Kernel.gaussian(r, σ, 'meters')).convolve(ee.Kernel.laplacian8(3))) // LoG

    // false-color index
    var ndwi = image.normalizedDifference(['green', 'nir']).unitScale(-0.1, 0.5)
    var mndwi = image.normalizedDifference(['green', 'swir']).unitScale(-0.1, 0.5)
    var ndvi = image.normalizedDifference(['red', 'nir']).unitScale(-0.1, 0.5)
    
    // return ee.Image([ndvi, ndvi, mndwi]).visualize({})
  
    //return image.visualize({bands:['red','green','blue'], gamma: 1.8, min:0.05, max:[0.5, 0.5, 0.55]})
    //return image.normalizedDifference(['green', 'nir']).visualize({palette:palettes.Blues[9], min: -0.1, max: 0.3})    
    // return image.visualize({bands:['swir','nir','red'], gamma: 1.4, min: 0.07, max: 0.6})

    // band fiddling
    // image = image.subtract(image.convolve(ee.Kernel.gaussian(Map.getScale()*2, Map.getScale(), 'meters')).convolve(ee.Kernel.laplacian8(1))) // LoG
    //var bands = ['red','green','blue']
    var bands = ['swir', 'nir', 'red']

    var enhanceNir = 0
    //var enhanceNir = 1
    
    if(enhanceNir) {
      image = image.select(bands).add(ee.Image([
      //image = image.select(['red', 'green', 'blue']).add(ee.Image([
        ee.Image(0).float(), 
        image.select('nir'), 
        ee.Image(0).float(), 
        // ndwi.multiply(0.15)
      ]))
    //image = image.visualize({bands:bands, min: [0.05, 0.1, 0.1], max: [0.5, 1.0, 0.4], gamma: 1.6 })
    }
    
    image = image.visualize({bands:bands, min: 0.01, max: 0.5, gamma: 1.2 })
    
    var blendWater = 1
    // var blendWater = 0
    
    if(blendWater) {
      var water = ee.Image([ndwi, ndvi, mndwi])
      water = water.mask(water.reduce(ee.Reducer.max()).pow(2))
      
      // image = image.blend(water.visualize().updateMask(0.5))
    }
      
    // image = image.blend(mndwi.mask(mndwi).visualize({ palette: ['00ffff'], min: 0, max: 1 }))
      
    return image
      .set({ label: i.date().format('YYYY-MM-dd').cat(' ').cat(i.get('MISSION')) })
  })

// animate
animation.animate(images, {label: 'label', maxFrames: 200})  

// export video
var utils = require('users/gena/packages:utils')
utils.exportVideo(images, {
  bounds: bounds, 
  label: 'label', 
  maxFrames: 600, 
  name: 'animation', 
  label: 'label', 
  framesPerSecond: 10 
})


