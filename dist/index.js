"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sbi_1 = require("./lib/sbi");
class SBIHandler extends sbi_1.SBI {
    constructor(userName, password) {
        super(userName, password);
    }
}
exports.default = SBIHandler;
