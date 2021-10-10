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

const createDefaultWrapper = (color) => {
  const wrapper = createWrapper({
    color,
    highlightedClass: "my-highlights",
    contextClass: "highlighter-context",
  })
  const timestamp = (+new Date()).toString();
  wrapper.setAttribute('data-timestamp', timestamp);
  wrapper.setAttribute('data-highlighted', true);
  return wrapper;
}

const findSubranges = (range, color) => {

  const content = range.cloneContents()

  var newNodes = []
  // if there are child nodes that aren't highlights, then split and run wrapRange on all of them separately
  let textContent = ''
  content.childNodes.forEach((child, index) => {
    console.log(child, index)
    if(shouldBeSeparate(child)) {
      if(textContent != '') {
        const textNode = document.createTextNode(textContent)
        newNodes.push(textNode)
        textContent = ''
      }

      if(child.childNodes.length > 1) {
        const range2 = new Range()
        range2.selectNodeContents(child)
        console.log("separating")
        newNodes = [...newNodes, ...findSubranges(range2, color)]
      } else {
        newNodes.push(child)
      }
      
    } else {
      textContent += child.textContent
    }
  })

  if(textContent != '') {
    const textNode = document.createTextNode(textContent)
    newNodes.push(textNode)
    textContent = ''
  }

  return newNodes;
}

const wrapRange = (range, color = "#BBB") => {
  const subRanges = findSubranges(range, color);

  range.deleteContents()
  subRanges.reverse()
  subRanges.forEach(node => {
    const wrapper = createDefaultWrapper(color)
    wrapper.textContent = node.textContent
    if(node.innerHTML) {
      const fakeNode = document.createElement("span")
      node.textContent = ''
      range.insertNode(fakeNode)
      fakeNode.previousSibling.insertAdjacentElement('beforeEnd', wrapper)
      fakeNode.remove()
    } else {
      range.insertNode(wrapper)
    }
  })
}

const shouldBeSeparate = (node) => {
  return node.tagName && !node.dataset.highlighted
}

const isIgnorable = (node) => {
  const nodeTypesToIgnore = ["IMG"]
  const nodeName = node.children && node.children[0]?.nodeName
  return nodeTypesToIgnore.includes(nodeName)
}

const nodeWithoutHighlight = (node) => {
  if(node.tagName == 'SPAN') {
    return nodeWithoutHighlight(node.parentElement)
  } else {
    return node
  }
}

// TODO
// 1. Save the old range after "deconstructHighlights" (and maybe get a better function name)
// 2. When clicking a highlight color, do that color on the saved range and then save to localstorage
// 2b. - any updates needed to localstorage, or is it all good with current format?
// 3. When clicking away, reload from localstorage

const deconstructHighlights = (range, color) => {
  const { startContainer, endContainer, startOffset, endOffset, commonAncestorContainer } = range
  let endElement = endContainer.parentElement;
  let startElement = startContainer.parentElement;

  if(startContainer == endContainer) {
    if(isIgnorable(startContainer)) {
      return;
    }
    wrapRange(range, color)
  } else if(nodeWithoutHighlight(startElement) == nodeWithoutHighlight(endElement)) {
    // this is easy-mode... just add highlight
    wrapRange(range, color)
  } else {
    const children = commonAncestorContainer.childNodes;
    wrapMultipleElements(children, range, color)
  }
}

// this doesn't work when wrapping elements that have a non-highlight span, such as a paragraphNumber.
// TODO - fix it to separate out those and save the paragraphNumber and the paragraph separately
const wrapMultipleElements = (children, range, color) => {
  const { startContainer, endContainer, startOffset, endOffset, commonAncestorContainer } = range

  for(let i = 0; i < children.length; i++) {
    let node = children[i]

    if(!isIgnorable(node) && range.intersectsNode(node)) {
      const range2 = new Range();
      range2.selectNodeContents(node)
      if(startContainer.parentElement == node || nodeWithoutHighlight(startContainer.parentElement) == nodeWithoutHighlight(node)) {
        range2.setStart(startContainer, startOffset)
      } else if(endContainer.parentElement == node || nodeWithoutHighlight(endContainer.parentElement) == nodeWithoutHighlight(node)) {
        range2.setEnd(endContainer, endOffset)
      }
      wrapRange(range2, color)
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

    const range = temporaryHighlights.value;
    if(range.startContainer.parentElement == range.endContainer) {
      wrapRange(range, color)
    } else {
      const children = range.commonAncestorContainer.childNodes;
      wrapMultipleElements(children, range, color)
    }

    const text = document.getElementById(textId)
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

    deconstructHighlights(range)

    temporaryHighlightsRange.value = range;
    temporaryHighlights.value = range;

    document.getSelection().removeAllRanges();    
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