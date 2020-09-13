class B787_10_ND extends B787_10_CommonMFD.MFDTemplateElement {
    constructor() {
        super(...arguments);
        this.mapIsCentered = false;
        this.wxRadarOn = false;
        this.terrainOn = false;
        this.mapRange = 0;
        this.wantedMapRange = 0;
        this.mapMode = 0;
        this.wantedMapMode = 0;
        this.mapConfigId = 0;
        this.modeChangeTimer = -1;
        this.forceMapUpdate = false;
        this.navHighlight = -1;
        this.navHighlightTimer = -1.0;
        this.navHighlightLastIndex = 0;
        this.navButtons = new Array();
        this.compassNavigationMode = Jet_NDCompass_Navigation.NAV;
    }
    get templateID() { return "B787_10_ND_Template"; }
    get pageIdentifier() { return MFDPageType.ND; }
    initChild() {
    }
    setGPS(_gps) {
        this.gps = _gps;
        if (!this.map && this.gps) {
            this.modeChangeMask = _gps.getChildById("ModeChangeMask");
            this.compass = new B787_10_ND_Compass(_gps);
            this.compass.init(_gps.getChildById("#Compass"));
            this.map = new B787_10_ND_Map(this);
            this.map.init(_gps.getChildById("#Map"));
            this.info = new B787_10_ND_Info(_gps);
            this.info.init(_gps.getChildById("#NDInfo"));
            this.navButtons.push(_gps.getChildById("#Button_Map"));
            this.navButtons.push(_gps.getChildById("#Button_Plan"));
            this.navButtons.push(_gps.getChildById("#Button_Menu"));
            for (let i = 0; i < this.navButtons.length; i++) {
                this.navButtons[i].addEventListener("mouseover", this.onMouseOver.bind(this, i));
                this.navButtons[i].addEventListener("mouseleave", this.onMouseLeave.bind(this, i));
                this.navButtons[i].addEventListener("mouseup", this.onMousePress.bind(this, i));
            }
            this.navMenu = new B787_10_ND_NavigationMenu(this, _gps.getChildById("#Map_Menu"));
            this.onNavButton(0);
            this.forceMapUpdate = true;
        }
    }
    show(_xPercent, _widthPercent) {
        super.show(_xPercent, _widthPercent);
        let isFullscreen = true;
        if (_widthPercent <= 50)
            isFullscreen = false;
        this.setAttribute("halfsize", (isFullscreen) ? "false" : "true");
        if (this.compass)
            this.compass.setFullscreen(isFullscreen);
    }
    updateChild(_deltaTime) {
        if (this.info != null) {
            this.updateNDInfo(_deltaTime);
            this.info.onUpdate(_deltaTime);
        }
        if (this.compass != null) {
            this.compass.onUpdate(_deltaTime);
        }
        if (this.map != null) {
            this.updateMap(_deltaTime);
            this.map.onUpdate(_deltaTime);
        }
        if (this.navMenu) {
            this.navMenu.onUpdate(_deltaTime);
        }
    }
    onEvent(_event) {
        if (!this.isVisible())
            return;
        switch (_event) {
            case "AUTOPILOT_CTR":
                if (this.map.mode != Jet_NDCompass_Display.PLAN) {
                    this.mapIsCentered = !this.mapIsCentered;
                    this.forceMapUpdate = true;
                    this.onNavButton(0);
                    this.navMenu.refresh();
                }
                break;
            case "WXR":
                if (this.wxRadarOn) {
                    SimVar.SetSimVarValue("L:BTN_WX_ACTIVE:" + this.gps.instrumentIndex, "number", 0);
                }
                else {
                    SimVar.SetSimVarValue("L:BTN_WX_ACTIVE:" + this.gps.instrumentIndex, "number", 1);
                    SimVar.SetSimVarValue("L:BTN_TERRONND_ACTIVE:" + this.gps.instrumentIndex, "number", 0);
                }
                this.navMenu.refresh();
                break;
            case "TERR":
                if (this.terrainOn) {
                    SimVar.SetSimVarValue("L:BTN_TERRONND_ACTIVE:" + this.gps.instrumentIndex, "number", 0);
                }
                else {
                    SimVar.SetSimVarValue("L:BTN_TERRONND_ACTIVE:" + this.gps.instrumentIndex, "number", 1);
                    SimVar.SetSimVarValue("L:BTN_WX_ACTIVE:" + this.gps.instrumentIndex, "number", 0);
                }
                this.navMenu.refresh();
                break;
            case "TFC":
                this.map.instrument.showTraffic = !this.map.instrument.showTraffic;
                this.navMenu.refresh();
                break;
            case "Range_DEC":
                if (this.wantedMapRange > 0)
                    this.wantedMapRange--;
                break;
            case "Range_INC":
                if (this.wantedMapRange < this.map.zoomRanges.length - 1)
                    this.wantedMapRange++;
                break;
            case "Cursor_DEC":
                if (this.navMenu.visible) {
                    this.navMenu.onEvent(_event);
                }
                else {
                    if (this.navHighlight > 0)
                        this.setNavHighlight(this.navHighlight - 1);
                    else if (this.navHighlight == -1)
                        this.setNavHighlight(this.navHighlightLastIndex);
                }
                break;
            case "Cursor_INC":
                if (this.navMenu.visible) {
                    this.navMenu.onEvent(_event);
                }
                else {
                    if (this.navHighlight >= 0 && this.navHighlight < this.navButtons.length - 1)
                        this.setNavHighlight(this.navHighlight + 1);
                    else if (this.navHighlight == -1)
                        this.setNavHighlight(this.navHighlightLastIndex);
                }
                break;
            case "Cursor_Press":
                if (this.navMenu.visible) {
                    this.navMenu.onEvent(_event);
                }
                else {
                    if (this.navHighlight >= 0) {
                        this.onNavButton(this.navHighlight);
                        if (this.navMenu.visible)
                            this.setNavHighlight(-1);
                    }
                }
                break;
        }
    }
    updateMap(_deltaTime) {
        if (this.modeChangeMask && this.modeChangeTimer >= 0) {
            this.modeChangeTimer -= _deltaTime / 1000;
            if (this.modeChangeTimer <= 0) {
                this.modeChangeMask.style.display = "none";
                this.modeChangeTimer = -1;
            }
        }
        if (this.navHighlightTimer >= 0) {
            this.navHighlightTimer -= _deltaTime / 1000;
            if (this.navHighlightTimer <= 0) {
                this.setNavHighlight(-1);
                this.navHighlightTimer = -1;
            }
        }
        var wxRadarOn = SimVar.GetSimVarValue("L:BTN_WX_ACTIVE:" + this.gps.instrumentIndex, "bool");
        var terrainOn = SimVar.GetSimVarValue("L:BTN_TERRONND_ACTIVE:" + this.gps.instrumentIndex, "number");
        if (this.mapMode != this.wantedMapMode || this.wxRadarOn != wxRadarOn || this.terrainOn != terrainOn || this.wantedMapRange != this.mapRange || this.forceMapUpdate) {
            this.wxRadarOn = wxRadarOn;
            this.terrainOn = terrainOn;
            this.mapRange = this.wantedMapRange;
            this.mapMode = this.wantedMapMode;
            if (this.mapMode == 0) {
                if (this.mapIsCentered) {
                    this.compass.setMode(Jet_NDCompass_Display.ROSE, this.compassNavigationMode);
                    this.map.setMode(Jet_NDCompass_Display.ROSE);
                    this.info.setMode(this.compassNavigationMode);
                }
                else {
                    this.compass.setMode(Jet_NDCompass_Display.ARC, this.compassNavigationMode);
                    this.map.setMode(Jet_NDCompass_Display.ARC);
                    this.info.setMode(this.compassNavigationMode);
                }
            }
            else {
                this.compass.setMode(Jet_NDCompass_Display.PLAN, this.compassNavigationMode);
                this.map.setMode(Jet_NDCompass_Display.PLAN);
                this.info.setMode(this.compassNavigationMode);
            }
            this.setMapRange(this.mapRange);
            if (this.terrainOn) {
                this.mapConfigId = 1;
                this.compass.showArcRange(false);
            }
            else if (this.wxRadarOn) {
                this.showWeather();
            }
            else {
                this.mapConfigId = 0;
                this.compass.showArcRange(false);
            }
            if (this.modeChangeMask) {
                this.modeChangeMask.style.display = "block";
                this.modeChangeTimer = 0.15;
            }
            this.forceMapUpdate = false;
        }
        switch (this.mapConfigId) {
            case 0:
                if (this.map.instrument.mapConfigId != 0) {
                    this.map.instrument.mapConfigId = 0;
                    this.map.instrument.bingMapRef = EBingReference.SEA;
                }
                break;
            case 1:
                let altitude = Simplane.getAltitudeAboveGround();
                if (altitude >= 500 && this.map.instrument.mapConfigId != 1) {
                    this.map.instrument.mapConfigId = 1;
                    this.map.instrument.bingMapRef = EBingReference.PLANE;
                }
                else if (altitude < 490 && this.map.instrument.mapConfigId != 0) {
                    this.map.instrument.mapConfigId = 0;
                    this.map.instrument.bingMapRef = EBingReference.SEA;
                }
                break;
        }
    }
    onNavButton(_button) {
        switch (_button) {
            case 0:
                this.wantedMapMode = 0;
                this.navMenu.visible = false;
                break;
            case 1:
                this.wantedMapMode = 1;
                this.navMenu.visible = false;
                break;
            case 2:
                if (this.navMenu.visible) {
                    this.navMenu.visible = false;
                    this.setNavHighlight(2);
                }
                else {
                    this.navMenu.visible = true;
                }
                break;
        }
        if (this.wantedMapMode == 0) {
            this.navButtons[0].classList.add("active");
            this.navButtons[1].classList.remove("active");
        }
        else {
            this.navButtons[0].classList.remove("active");
            this.navButtons[1].classList.add("active");
        }
        if (this.navMenu.visible)
            this.navButtons[2].classList.add("active");
        else
            this.navButtons[2].classList.remove("active");
    }
    setMapRange(_range) {
        this.mapRange = _range;
        this.map.instrument.setZoom(this.mapRange);
        this.compass.setRange(this.map.zoomRanges[this.mapRange]);
    }
    showWeather() {
        this.compass.showArcRange(true);
        this.map.showWeather();
    }
    updateNDInfo(_deltaTime) {
        this.info.showSymbol(B787_10_ND_Symbol.WXR, this.wxRadarOn);
        this.info.showSymbol(B787_10_ND_Symbol.WXRINFO, this.wxRadarOn);
        this.info.showSymbol(B787_10_ND_Symbol.TERR, this.terrainOn);
        this.info.showSymbol(B787_10_ND_Symbol.STA, this.map.instrument.showNDBs);
        this.info.showSymbol(B787_10_ND_Symbol.WPT, this.map.instrument.showIntersections);
        this.info.showSymbol(B787_10_ND_Symbol.ARPT, this.map.instrument.showAirports);
    }
    setNavHighlight(_index) {
        if (this.navHighlight != _index) {
            if (this.navHighlight >= 0) {
                this.navButtons[this.navHighlight].classList.remove("highlight");
                this.navHighlight = -1;
                this.navHighlightTimer = -1.0;
            }
            if (_index >= 0) {
                this.navButtons[_index].classList.add("highlight");
                this.navHighlight = _index;
                this.navHighlightTimer = 5.0;
                this.navHighlightLastIndex = _index;
            }
        }
    }
    onMouseOver(_index) {
        if (_index >= 0 && _index < this.navButtons.length) {
            this.setNavHighlight(_index);
        }
    }
    onMouseLeave(_index) {
        this.setNavHighlight(-1);
    }
    onMousePress(_index) {
        if (_index >= 0 && _index < this.navButtons.length) {
            this.onNavButton(_index);
        }
    }
    getMap() {
        return this.map;
    }
}
var B787_10_ND_PopupMenu_Key;
(function (B787_10_ND_PopupMenu_Key) {
    B787_10_ND_PopupMenu_Key[B787_10_ND_PopupMenu_Key["VSD"] = 0] = "VSD";
    B787_10_ND_PopupMenu_Key[B787_10_ND_PopupMenu_Key["MAP_MODE"] = 1] = "MAP_MODE";
    B787_10_ND_PopupMenu_Key[B787_10_ND_PopupMenu_Key["MAP_SYMBOL_TFC"] = 2] = "MAP_SYMBOL_TFC";
    B787_10_ND_PopupMenu_Key[B787_10_ND_PopupMenu_Key["MAP_SYMBOL_APT"] = 3] = "MAP_SYMBOL_APT";
    B787_10_ND_PopupMenu_Key[B787_10_ND_PopupMenu_Key["MAP_SYMBOL_WPT"] = 4] = "MAP_SYMBOL_WPT";
    B787_10_ND_PopupMenu_Key[B787_10_ND_PopupMenu_Key["MAP_SYMBOL_STA"] = 5] = "MAP_SYMBOL_STA";
    B787_10_ND_PopupMenu_Key[B787_10_ND_PopupMenu_Key["MAP_SYMBOL_POS"] = 6] = "MAP_SYMBOL_POS";
    B787_10_ND_PopupMenu_Key[B787_10_ND_PopupMenu_Key["MAP_SYMBOL_DATA"] = 7] = "MAP_SYMBOL_DATA";
    B787_10_ND_PopupMenu_Key[B787_10_ND_PopupMenu_Key["NAV_VOR_L"] = 8] = "NAV_VOR_L";
    B787_10_ND_PopupMenu_Key[B787_10_ND_PopupMenu_Key["NAV_VOR_R"] = 9] = "NAV_VOR_R";
    B787_10_ND_PopupMenu_Key[B787_10_ND_PopupMenu_Key["MAP_SYMBOL_FIR"] = 10] = "MAP_SYMBOL_FIR";
    B787_10_ND_PopupMenu_Key[B787_10_ND_PopupMenu_Key["MAP_SYMBOL_AIRSP"] = 11] = "MAP_SYMBOL_AIRSP";
})(B787_10_ND_PopupMenu_Key || (B787_10_ND_PopupMenu_Key = {}));
class B787_10_ND_NavigationMenu extends Airliners.PopupMenu_Handler {
    constructor(_parent, _root) {
        super();
        this.isVisible = false;
        this.textSize = 24;
        this.parent = _parent;
        this.root = _root;
        this.dictionary = new Avionics.Dictionary();
        this.menuLeft = 5;
        this.menuTop = 20;
        this.menuWidth = 145;
        this.columnLeft2 = 50;
        this.lineHeight = 45;
        this.sectionBorderSize = 2.5;
        this.textStyle = "Roboto-Regular";
        this.highlightColor = "magenta";
        this.interactionColor = "lime";
        this.disabledColor = "cyan";
        this.shape3D = true;
        this.shapeFillColor = "#414141";
        this.shapeFillIfDisabled = false;
    }
    get visible() {
        return this.isVisible;
    }
    set visible(_val) {
        if (this.isVisible != _val) {
            this.isVisible = _val;
            Utils.RemoveAllChildren(this.root);
            if (_val) {
                this.fillDictionary();
                if (this.parent.getMap().mode == Jet_NDCompass_Display.PLAN)
                    this.showPlan();
                else
                    this.showMap();
            }
        }
    }
    refresh() {
        if (this.isVisible) {
            Utils.RemoveAllChildren(this.root);
            this.fillDictionary();
            if (this.parent.getMap().mode == Jet_NDCompass_Display.PLAN)
                this.showPlan();
            else
                this.showMap();
        }
    }
    onUpdate(_deltaTime) {
        super.onUpdate(_deltaTime);
        if (this.dictionary.changed) {
            this.readDictionary();
            this.dictionary.changed = false;
        }
    }
    onEvent(_event) {
        switch (_event) {
            case "Cursor_Press":
                this.onActivate();
                break;
            case "Cursor_DEC":
                this.onMenuDec();
                break;
            case "Cursor_INC":
                this.onMenuInc();
                break;
        }
    }
    showMap() {
        let sectionRoot = this.openMenu();
        {
            this.beginSection();
            {
                this.addCheckbox("VSD", this.textSize, [B787_10_ND_PopupMenu_Key.VSD]);
            }
            this.endSection();
            this.buildTopShape(sectionRoot);
            this.beginSection(false);
            {
                this.addRadio("WXR", this.textSize, [B787_10_ND_PopupMenu_Key.MAP_MODE]);
                this.addRadio("TERR", this.textSize, [B787_10_ND_PopupMenu_Key.MAP_MODE]);
            }
            this.endSection();
            this.beginSection();
            {
                this.addCheckbox("TFC", this.textSize, [B787_10_ND_PopupMenu_Key.MAP_SYMBOL_TFC]);
                this.addCheckbox("APT", this.textSize, [B787_10_ND_PopupMenu_Key.MAP_SYMBOL_APT]);
                this.addCheckbox("WPT", this.textSize, [B787_10_ND_PopupMenu_Key.MAP_SYMBOL_WPT]);
                this.addCheckbox("STA", this.textSize, [B787_10_ND_PopupMenu_Key.MAP_SYMBOL_STA]);
                this.addCheckbox("POS", this.textSize, [B787_10_ND_PopupMenu_Key.MAP_SYMBOL_POS]);
                this.addCheckbox("DATA", this.textSize, [B787_10_ND_PopupMenu_Key.MAP_SYMBOL_DATA]);
            }
            this.endSection();
            this.beginSection();
            {
                this.addCheckbox("VOR L", this.textSize, [B787_10_ND_PopupMenu_Key.NAV_VOR_L]);
                this.addCheckbox("VOR R", this.textSize, [B787_10_ND_PopupMenu_Key.NAV_VOR_R]);
            }
            this.endSection();
            this.beginSection();
            {
                this.addCheckbox("FIR", this.textSize, null);
                this.addCheckbox("AIRSP", this.textSize, null);
            }
            this.endSection();
            this.beginSection();
            {
                this.addButton("EXIT", this.textSize, this.onExit.bind(this));
            }
            this.endSection();
        }
        this.closeMenu();
        Utils.RemoveAllChildren(this.root);
        this.root.appendChild(sectionRoot);
    }
    showPlan() {
        let sectionRoot = this.openMenu();
        {
            this.beginSection();
            {
                this.addCheckbox("APT", this.textSize, [B787_10_ND_PopupMenu_Key.MAP_SYMBOL_APT]);
                this.addCheckbox("WPT", this.textSize, [B787_10_ND_PopupMenu_Key.MAP_SYMBOL_WPT]);
                this.addCheckbox("STA", this.textSize, [B787_10_ND_PopupMenu_Key.MAP_SYMBOL_STA]);
                this.addCheckbox("DATA", this.textSize, [B787_10_ND_PopupMenu_Key.MAP_SYMBOL_DATA]);
            }
            this.endSection();
            this.buildTopShape(sectionRoot);
            this.beginSection();
            {
                this.addCheckbox("FIR", this.textSize, null);
                this.addCheckbox("AIRSP", this.textSize, null);
            }
            this.endSection();
            this.beginSection();
            {
                this.addButton("EXIT", this.textSize, this.onExit.bind(this));
            }
            this.endSection();
        }
        this.closeMenu();
        Utils.RemoveAllChildren(this.root);
        this.root.appendChild(sectionRoot);
    }
    buildTopShape(_root) {
        let x = this.menuLeft + 20;
        let y = -this.menuTop + 1;
        let width = this.menuWidth - x;
        let height = this.menuTop + 1;
        let bg = document.createElementNS(Avionics.SVG.NS, "rect");
        bg.setAttribute("d", "M" + (x) + " " + (y + height) + " l15 " + (-height) + " l" + (width - 15) + " 0 l0 " + (height));
        bg.setAttribute("x", x.toString());
        bg.setAttribute("y", y.toString());
        bg.setAttribute("width", width.toString());
        bg.setAttribute("height", height.toString());
        bg.setAttribute("fill", "black");
        _root.appendChild(bg);
        let shape = document.createElementNS(Avionics.SVG.NS, "path");
        shape.setAttribute("d", "M" + (x) + " " + (y + height - 1) + " l15 " + (-(height - 1)) + " l" + (width - 15) + " 0 l0 " + (height));
        shape.setAttribute("fill", "none");
        shape.setAttribute("stroke", "white");
        shape.setAttribute("stroke-width", this.sectionBorderSize.toString());
        _root.appendChild(shape);
    }
    onExit() {
        this.parent.onNavButton(2);
    }
    readDictionary() {
        this.parent.getMap().instrument.showTraffic = (this.dictionary.get(B787_10_ND_PopupMenu_Key.MAP_SYMBOL_TFC) == "ON") ? true : false;
        this.parent.getMap().instrument.showAirports = (this.dictionary.get(B787_10_ND_PopupMenu_Key.MAP_SYMBOL_APT) == "ON") ? true : false;
        this.parent.getMap().instrument.showIntersections = (this.dictionary.get(B787_10_ND_PopupMenu_Key.MAP_SYMBOL_WPT) == "ON") ? true : false;
        this.parent.getMap().instrument.showNDBs = (this.dictionary.get(B787_10_ND_PopupMenu_Key.MAP_SYMBOL_STA) == "ON") ? true : false;
        this.parent.getMap().instrument.showVORs = (this.dictionary.get(B787_10_ND_PopupMenu_Key.MAP_SYMBOL_POS) == "ON") ? true : false;
        this.parent.getMap().instrument.showConstraints = (this.dictionary.get(B787_10_ND_PopupMenu_Key.MAP_SYMBOL_DATA) == "ON") ? true : false;
        let mode = this.dictionary.get(B787_10_ND_PopupMenu_Key.MAP_MODE);
        if (mode == "WXR") {
            SimVar.SetSimVarValue("L:BTN_WX_ACTIVE:" + this.parent.gps.instrumentIndex, "number", 1);
            SimVar.SetSimVarValue("L:BTN_TERRONND_ACTIVE:" + this.parent.gps.instrumentIndex, "number", 0);
        }
        else if (mode == "TERR") {
            SimVar.SetSimVarValue("L:BTN_TERRONND_ACTIVE:" + this.parent.gps.instrumentIndex, "number", 1);
            SimVar.SetSimVarValue("L:BTN_WX_ACTIVE:" + this.parent.gps.instrumentIndex, "number", 0);
        }
        else {
            SimVar.SetSimVarValue("L:BTN_WX_ACTIVE:" + this.parent.gps.instrumentIndex, "number", 0);
            SimVar.SetSimVarValue("L:BTN_TERRONND_ACTIVE:" + this.parent.gps.instrumentIndex, "number", 0);
        }
        let vorL = (this.dictionary.get(B787_10_ND_PopupMenu_Key.NAV_VOR_L) == "ON") ? 2 : 0;
        SimVar.SetSimVarValue("L:XMLVAR_NAV_AID_SWITCH_L1_State", "number", vorL);
        let vorR = (this.dictionary.get(B787_10_ND_PopupMenu_Key.NAV_VOR_R) == "ON") ? 2 : 0;
        SimVar.SetSimVarValue("L:XMLVAR_NAV_AID_SWITCH_L2_State", "number", vorR);
    }
    fillDictionary() {
        this.dictionary.set(B787_10_ND_PopupMenu_Key.MAP_SYMBOL_TFC, (this.parent.getMap().instrument.showTraffic) ? "ON" : "OFF");
        this.dictionary.set(B787_10_ND_PopupMenu_Key.MAP_SYMBOL_APT, (this.parent.getMap().instrument.showAirports) ? "ON" : "OFF");
        this.dictionary.set(B787_10_ND_PopupMenu_Key.MAP_SYMBOL_WPT, (this.parent.getMap().instrument.showIntersections) ? "ON" : "OFF");
        this.dictionary.set(B787_10_ND_PopupMenu_Key.MAP_SYMBOL_STA, (this.parent.getMap().instrument.showNDBs) ? "ON" : "OFF");
        this.dictionary.set(B787_10_ND_PopupMenu_Key.MAP_SYMBOL_POS, (this.parent.getMap().instrument.showVORs) ? "ON" : "OFF");
        this.dictionary.set(B787_10_ND_PopupMenu_Key.MAP_SYMBOL_DATA, (this.parent.getMap().instrument.showConstraints) ? "ON" : "OFF");
        var terrainOn = SimVar.GetSimVarValue("L:BTN_TERRONND_ACTIVE:" + this.parent.gps.instrumentIndex, "number");
        if (terrainOn)
            this.dictionary.set(B787_10_ND_PopupMenu_Key.MAP_MODE, "TERR");
        else {
            var wxRadarOn = SimVar.GetSimVarValue("L:BTN_WX_ACTIVE:" + this.parent.gps.instrumentIndex, "bool");
            if (wxRadarOn)
                this.dictionary.set(B787_10_ND_PopupMenu_Key.MAP_MODE, "WXR");
            else
                this.dictionary.remove(B787_10_ND_PopupMenu_Key.MAP_MODE);
        }
        let vorL = SimVar.GetSimVarValue("L:XMLVAR_NAV_AID_SWITCH_L1_State", "number");
        this.dictionary.set(B787_10_ND_PopupMenu_Key.NAV_VOR_L, (vorL) ? "ON" : "OFF");
        let vorR = SimVar.GetSimVarValue("L:XMLVAR_NAV_AID_SWITCH_L2_State", "number");
        this.dictionary.set(B787_10_ND_PopupMenu_Key.NAV_VOR_R, (vorR) ? "ON" : "OFF");
    }
}
class B787_10_ND_Compass extends NavSystemElement {
    constructor(_gps) {
        super();
        this.setGPS(_gps);
    }
    init(root) {
        this.ndCompass = this.gps.getChildById("Compass");
        this.ndCompass.aircraft = Aircraft.AS01B;
        this.ndCompass.gps = this.gps;
    }
    onEnter() {
    }
    onUpdate(_deltaTime) {
        this.ndCompass.update(_deltaTime);
    }
    onExit() {
    }
    onEvent(_event) {
    }
    setMode(_display, _Navigation) {
        this.ndCompass.setMode(_display, _Navigation);
    }
    setRange(_range) {
        this.ndCompass.mapRange = _range;
    }
    showArcRange(_val) {
        this.ndCompass.showArcRange(_val);
    }
    setFullscreen(_val) {
        this.ndCompass.setFullscreen(_val);
    }
}
class B787_10_ND_Map extends MapInstrumentElement {
    constructor(_parent) {
        super();
        this.zoomRanges = [0.25, 0.5, 1, 2, 5, 10, 20, 40, 80, 160, 320, 640];
        this._parent = _parent;
        this.setGPS(this._parent.gps);
    }
    get mode() { return this._mode; }
    init(_root) {
        super.init(_root);
        this.instrument.zoomRanges = [10, 20, 40, 60, 160, 320, 640];
        this.instrument.setZoom(0);
        this.instrument.showRoads = false;
        this.instrument.showObstacles = false;
        this.instrument.showVORs = false;
        this.instrument.showIntersections = false;
        this.instrument.showNDBs = false;
        this.instrument.showAirports = false;
        this.instrument.showAirspaces = false;
        this.instrument.intersectionMaxRange = Infinity;
        this.instrument.vorMaxRange = Infinity;
        this.instrument.ndbMaxRange = Infinity;
        this.instrument.smallAirportMaxRange = Infinity;
        this.instrument.medAirportMaxRange = Infinity;
        this.instrument.largeAirportMaxRange = Infinity;
    }
    onTemplateLoaded() {
        super.onTemplateLoaded();
    }
    getAdaptiveRanges(_factor) {
        let ranges = Array.from(this.zoomRanges);
        for (let i = 0; i < ranges.length; i++)
            ranges[i] *= _factor;
        return ranges;
    }
    setMode(_mode) {
        this.hideWeather();
        this._mode = _mode;
        SimVar.SetSimVarValue("L:B787_MAP_MODE", "number", _mode);
        switch (_mode) {
            case Jet_NDCompass_Display.ROSE:
                {
                    this.instrument.style.top = "0%";
                    this.instrument.rotateWithPlane(true);
                    this.instrument.centerOnActiveWaypoint(false);
                    this.instrument.setPlaneScale(2.0);
                    this.instrument.setPlaneIcon(1);
                    this.instrument.zoomRanges = this.getAdaptiveRanges(4.5);
                    this._parent.setAttribute("mapstyle", "rose");
                    break;
                }
            case Jet_NDCompass_Display.ARC:
                {
                    this.instrument.style.top = "31%";
                    this.instrument.rotateWithPlane(true);
                    this.instrument.centerOnActiveWaypoint(false);
                    this.instrument.setPlaneScale(2.5);
                    this.instrument.setPlaneIcon(1);
                    this.instrument.zoomRanges = this.getAdaptiveRanges(2.3);
                    this._parent.setAttribute("mapstyle", "arc");
                    break;
                }
            case Jet_NDCompass_Display.PLAN:
                {
                    this.instrument.style.top = "0%";
                    this.instrument.rotateWithPlane(false);
                    this.instrument.centerOnActiveWaypoint(true);
                    this.instrument.setPlaneScale(2.0);
                    this.instrument.setPlaneIcon(3);
                    this.instrument.zoomRanges = this.getAdaptiveRanges(2.3);
                    this._parent.setAttribute("mapstyle", "plan");
                    break;
                }
        }
    }
    showWeather() {
        this.instrument.showWeatherWithGPS(EWeatherRadar.HORIZONTAL, Math.PI * 2.0);
        this.instrument.setBingMapStyle("-9%", "5.0%", "90%", "115%");
    }
    hideWeather() {
        if (this.instrument.getWeather() != EWeatherRadar.OFF) {
            this.instrument.showWeather(EWeatherRadar.OFF);
        }
    }
}
var B787_10_ND_Symbol;
(function (B787_10_ND_Symbol) {
    B787_10_ND_Symbol[B787_10_ND_Symbol["ARPT"] = 0] = "ARPT";
    B787_10_ND_Symbol[B787_10_ND_Symbol["WPT"] = 1] = "WPT";
    B787_10_ND_Symbol[B787_10_ND_Symbol["STA"] = 2] = "STA";
    B787_10_ND_Symbol[B787_10_ND_Symbol["TERR"] = 3] = "TERR";
    B787_10_ND_Symbol[B787_10_ND_Symbol["WXR"] = 4] = "WXR";
    B787_10_ND_Symbol[B787_10_ND_Symbol["WXRINFO"] = 5] = "WXRINFO";
})(B787_10_ND_Symbol || (B787_10_ND_Symbol = {}));
class B787_10_ND_Info extends NavSystemElement {
    constructor(_gps) {
        super();
        this.allSymbols = new Array();
        this.setGPS(_gps);
    }
    init(root) {
        this.ndInfo = root;
        this.ndInfo.aircraft = Aircraft.AS01B;
        this.ndInfo.gps = this.gps;
        this.allSymbols.push(this.ndInfo.querySelector("#ARPT"));
        this.allSymbols.push(this.ndInfo.querySelector("#WPT"));
        this.allSymbols.push(this.ndInfo.querySelector("#STA"));
        this.allSymbols.push(this.ndInfo.querySelector("#TERR"));
        this.allSymbols.push(this.ndInfo.querySelector("#WXR"));
        this.allSymbols.push(this.ndInfo.querySelector("#WXRInfo"));
    }
    onEnter() {
    }
    onUpdate(_deltaTime) {
        if (this.ndInfo != null) {
            this.ndInfo.update(_deltaTime);
        }
    }
    onExit() {
    }
    onEvent(_event) {
    }
    setMode(_mode) {
        this.ndInfo.setMode(_mode, 0);
    }
    showSymbol(_symbol, _show) {
        if (this.allSymbols[_symbol])
            this.allSymbols[_symbol].setAttribute("visibility", (_show) ? "visible" : "hidden");
    }
}
customElements.define("b787-10-nd-element", B787_10_ND);
//# sourceMappingURL=B787_10_ND.js.map
