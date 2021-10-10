import { createWrapper } from "@funktechno/texthighlighter/lib";


export const deconstructHighlights = (range, color) => {
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

export const wrapMultipleElements = (children, range, color) => {
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

export const wrapRange = (range, color = "#BBB") => {
  const content = range.cloneContents()
  const subRanges = findSubranges(content, color);

  range.deleteContents()
  subRanges.reverse()
  subRanges.forEach(node => {
    const wrapper = createDefaultWrapper(color)
    wrapper.textContent = node.textContent
    if(node.innerHTML) {
      node.textContent = ''
      const fakeNode = document.createElement("span")
      range.insertNode(fakeNode)
      if(fakeNode.previousSibling) {
        fakeNode.previousSibling.insertAdjacentElement('beforeEnd', wrapper)
      } else {
        node.insertAdjacentElement('afterBegin', wrapper)
        range.insertNode(node)
      }
      fakeNode.remove()
    } else {
      range.insertNode(wrapper)
    }
  })
}


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

export default {
  wrapRange,
  wrapMultipleElements,
  deconstructHighlights
}