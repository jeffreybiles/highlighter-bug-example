import { ref, computed, nextTick } from 'vue';
import { doHighlight, deserializeHighlights, serializeHighlights, removeHighlights } from "@funktechno/texthighlighter/lib/index";
import { normalizeHighlights } from "@funktechno/texthighlighter/lib/Library";
import { refineRangeBoundaries, NODE_TYPE, IGNORE_TAGS, DATA_ATTR } from "@funktechno/texthighlighter/lib/Utils";
import { dom } from "@/utils/dom";
import { useLocalStorage } from 'vue-composable';

const colors = ['#E0C3C4', '#ABE4B8', '#E1DCAD', '#E2CBA9', '#3F3F45']
const temporaryHighlights = ref(null)
const temporaryHighlightsRange = ref(null)

const highlightKey = 'highlights'
const textId = "highlightableText";

// What if we create a representation of the html
// And then a separate representation of where the highlights should go
// And finally, a way to put them together to show the highlights
// however, we'd also need a way to "undo", since they can click away from the grey one and we'll have to undo it
// so we'll create a set of commands which are reversible, and that gets us an 'undo' button as well
// these commands act on the skeleton set of highlights


// const highlights = [
//   {
//     startNode: {some representation that helps us find it},
//     startOffset: X,
//     endNode: {},
//     endOffset: Y
//   },
//   {

//   }
// ]

// addHighlight(text, highlights, newHighlight) {
//   const overlaps = findOverlaps(text, highlights, newHighlight)
//   overlaps.forEach(overlap => trimOverlap(overlap))
//   createHighlight(newHighlight)
// }


// textContent gives us the old version in the paragraph, before the span
// get through range.startContainer.parentElement.textContent 
// so we can 
// (still need to figure out how to get intermediate ones... maybe walk the tree on range.commonAncestorContainer.children)

// NOTES - things that could be useful
// if we want to remove specific ones, the timestamp may be useful...
// range.getBoundingClientRect() may be useful for placing the popup.... ({x: 248.5, y: 368.984375, width: 637.625, height: 51, top: 368.984375, …})

const wrapRange = (range) => {
  // this current one works when it's only one paragraph... 
  // but unfortunately it deletes *all* html tags, not just the highlight spans
  // that means it will delete paragraph breaks, images, etc.


  const content = range.cloneContents()
  // const unhighlightedContent = []
  // content.childNodes.forEach(n => {
  //   if(n.dataset?.highlighted) {
  //     unhighlightedContent.push(document.createTextNode(n.textContent))
  //   } else {
  //     console.log(n)
  //     unhighlightedContent.push(n)
  //   }
  // })
  // content.replaceChildren()
  // unhighlightedContent.forEach(x => content.appendChild(x))

  const wrapper = createWrapper({
    color: "#BBB",
    highlightedClass: "my-highlights",
    contextClass: "highlighter-context",
  })
  const timestamp = (+new Date()).toString();
  wrapper.setAttribute('data-timestamp', timestamp);

  wrapper.textContent = content.textContent

  
  range.deleteContents()
  range.insertNode(wrapper)

}

const isIgnorable = (node) => {
  const nodeTypesToIgnore = ["IMG"]
  const nodeName = node.children && node.children[0]?.nodeName
  return nodeTypesToIgnore.includes(nodeName)
}

const deconstructHighlights = (range) => {
  let endElement = range.endContainer.parentElement;
  let startElement = range.startContainer.parentElement;

  endElement = endElement.dataset.highlighted ? endElement.parentElement : endElement;
  startElement = startElement.dataset.highlighted ? startElement.parentElement : startElement;

  if(range.startContainer == range.endContainer) {
    if(isIgnorable(range.startContainer)) {
      return;
    }
    wrapRange(range)
  } else if(startElement == endElement) {
    // this is easy-mode... just add highlight
    wrapRange(range)
  } else {
    const children = range.commonAncestorContainer.childNodes;
    for(let i = 0; i < children.length; i++) {
      let node = children[i]

      if(isIgnorable(node)) {
        console.log("ignored") // do nothing
      } else {
        if(range.intersectsNode(node)) { //intersects node is "experimental", but is supported in all modern browsers
          // TODO - how to wrap each of these properly, only including what's within the range?
          console.log(node)
        } else {
          console.log("does not intersect") // do nothing
        }
        
      }
    }
    // TODO - have it find all the elements in between
    // now we have to find the correct elements and everything in between, and wrap them all
  }
}

function createWrapper(options) {
  const span = document.createElement("span");
  if (options.color) {
      span.style.backgroundColor = options.color;
      span.setAttribute("data-backgroundcolor", options.color);
  }
  if (options.highlightedClass) span.className = options.highlightedClass;
  return span;
}

export const useTextHighlighter = function() {
  const getHighlights = function() {
    return JSON.parse(localStorage.getItem(highlightKey))
  }
  const saveHighlights = function(data) {
    const highlightedData = serializeHighlights(data)

    localStorage.setItem(highlightKey, highlightedData)
  }
  const loadHighlights = function() {
    var text = document.getElementById(textId);
    removeHighlights(text);
    const highlights = getHighlights()
    if(text && highlights) deserializeHighlights(text, JSON.stringify(highlights))
  }

  const highlightText = function(highlightId, color) {
    document.getSelection().removeAllRanges();
    document.getSelection().addRange(temporaryHighlightsRange.value)

    const text = document.getElementById(textId)
    doHighlight(text, false, { color, highlightedClass: 'my-highlights' })
    saveHighlights(text)
    return text;
  }
  const runHighlight = async function(color){
    highlightText(textId, color)
  }

  const showHighlightPopup = function(){
    let wrapper, createdHighlights, normalizedHighlights, timestamp;
    if(document.getSelection().type !== 'Range') {
      return;
    }

    var text = document.getElementById(textId);

    const range = document.getSelection().getRangeAt(0)
    console.log(range)

    deconstructHighlights(range)
    // debugger

    // if(range.startContainer.data === range.endContainer.data) {
    //   console.log("we're in the same tag")
    // } else {
    //   console.log("different tags")
    // }

    // timestamp = (+new Date()).toString();
    // wrapper = createWrapper({
    //   color: "#BBB",
    //   highlightedClass: "highlighted",
    //   contextClass: "highlighter-context",
    // });
    // wrapper.setAttribute('data-timestamp', timestamp);

    // createdHighlights = highlightRange(text, range, wrapper);
    // normalizedHighlights = normalizeHighlights(createdHighlights);
    // console.log(range, createdHighlights, normalizedHighlights)

    // temporaryHighlightsRange.value = range;
    // temporaryHighlights.value = normalizedHighlights;
      // document.getSelection().removeAllRanges();
  }

  const hideHighlightPopup = function(){
    temporaryHighlights.value = null;
  }

  return {
    runHighlight,
    loadHighlights,
    colors,
    showHighlightPopup,
    hideHighlightPopup,
    temporaryHighlights,
    highlightText,
    textId
  };
}

export default useTextHighlighter;