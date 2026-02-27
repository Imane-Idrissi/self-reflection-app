import Cocoa

let app = NSWorkspace.shared.frontmostApplication
let pid = app?.processIdentifier ?? 0
let appName = app?.localizedName ?? ""

let appRef = AXUIElementCreateApplication(pid)
var focusedWindow: AnyObject?
AXUIElementCopyAttributeValue(appRef, kAXFocusedWindowAttribute as CFString, &focusedWindow)

var title: AnyObject?
if let window = focusedWindow {
    AXUIElementCopyAttributeValue(window as! AXUIElement, kAXTitleAttribute as CFString, &title)
}

let windowTitle = (title as? String) ?? ""

let result: [String: Any] = [
    "owner": ["name": appName],
    "title": windowTitle
]

if let data = try? JSONSerialization.data(withJSONObject: result),
   let json = String(data: data, encoding: .utf8) {
    print(json)
}
