import { SBI } from "./lib/sbi";

class SBIHandler extends SBI {
    constructor(userName: string, password: string) {
        super(userName, password);
    }
}

export default SBIHandler;