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


// NOTES - things that could be useful
// if we want to remove specific ones, the timestamp may be useful...
// range.getBoundingClientRect() may be useful for placing the popup.... ({x: 248.5, y: 368.984375, width: 637.625, height: 51, top: 368.984375, …})


const wrapRange = (range, color = "#BBB") => {
  const wrapper = createWrapper({
    color,
    highlightedClass: "my-highlights",
    contextClass: "highlighter-context",
  })
  const timestamp = (+new Date()).toString();
  wrapper.setAttribute('data-timestamp', timestamp);

  
  const content = range.cloneContents()
  wrapper.textContent = content.textContent
  
  range.deleteContents()
  range.insertNode(wrapper)
}

const isIgnorable = (node) => {
  const nodeTypesToIgnore = ["IMG"]
  const nodeName = node.children && node.children[0]?.nodeName
  return nodeTypesToIgnore.includes(nodeName)
}

const findNonspan = (node) => {
  if(node.tagName == 'SPAN') {
    return findNonspan(node.parentElement)
  } else {
    return node
  }
}

const deconstructHighlights = (range) => {
  const { startContainer, endContainer, startOffset, endOffset, commonAncestorContainer } = range
  let endElement = endContainer.parentElement;
  let startElement = startContainer.parentElement;

  if(startContainer == endContainer) {
    if(isIgnorable(startContainer)) {
      return;
    }
    wrapRange(range)
  } else if(findNonspan(startElement) == findNonspan(endElement)) {
    // this is easy-mode... just add highlight
    wrapRange(range)
  } else {
    const children = commonAncestorContainer.childNodes;
    for(let i = 0; i < children.length; i++) {
      let node = children[i]

      if(!isIgnorable(node) && range.intersectsNode(node)) {
        const range2 = new Range();
        range2.selectNodeContents(node)
        if(startContainer.parentElement == node || findNonspan(startContainer.parentElement) == findNonspan(node)) {
          range2.setStart(startContainer, startOffset)
        } else if(endContainer.parentElement == node || findNonspan(endContainer.parentElement) == findNonspan(node)) {
          range2.setEnd(endContainer, endOffset)
        }
        wrapRange(range2)
      }
    }
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