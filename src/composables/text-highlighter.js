import { ref, computed, nextTick } from 'vue';
import { doHighlight, deserializeHighlights, serializeHighlights, removeHighlights, createWrapper } from "@funktechno/texthighlighter/lib/index";
import { normalizeHighlights } from "@funktechno/texthighlighter/lib/Library";
import { refineRangeBoundaries, NODE_TYPE, IGNORE_TAGS, DATA_ATTR } from "@funktechno/texthighlighter/lib/Utils";
import { dom } from "@/utils/dom";
import { useLocalStorage } from 'vue-composable';

const colors = ['#E0C3C4', '#ABE4B8', '#E1DCAD', '#E2CBA9', '#3F3F45']
const temporaryHighlights = ref(null)
const temporaryHighlightsRange = ref(null)

const highlightKey = 'highlights'
const textId = "highlightableText";

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

const findSubranges = (rangeContent, color) => {
  let newNodes = []
  let textContent = ''

  const newTextNodeIfContent = () => {
    if(textContent != '') {
      const textNode = document.createTextNode(textContent)
      newNodes.push(textNode)
      textContent = ''
    }
  }
  
  rangeContent.childNodes.forEach((child, index) => {
    if(shouldBeSeparate(child)) {
      newTextNodeIfContent()

      if(child.childNodes.length > 1) {
        const range2 = new Range()
        range2.selectNodeContents(child)
        const contents = range2.cloneContents()
        console.log("splitting")
        newNodes = [...newNodes, ...findSubranges(contents, color)]
      } else {
        newNodes.push(child)
      }
      
    } else {
      textContent += child.textContent
    }
  })

  newTextNodeIfContent()

  return newNodes;
}

const wrapRange = (range, color = "#BBB") => {
  const content = range.cloneContents()
  const subRanges = findSubranges(content, color);

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
    wrapRange(range, color)
  } else {
    const children = commonAncestorContainer.childNodes;
    wrapMultipleElements(children, range, color)
  }
}

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