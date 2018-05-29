import { downloadAlternateNames } from "./downloader";

const ACTION = process.env.ACTION || process.argv[2];

if (!ACTION) {
    throw new Error(`env ACTION is required`);
}

function doAction(action: string) {
    switch (action) {
        case 'download-alternate-names':
        case 'download-alt-names':
        case 'download-altnames':
            return downloadAlternateNames();
        default:
            throw new Error(`Invalid action=${action}`);
    }
}

doAction(ACTION)
    .then(() => console.log('DONE!'))
    .catch(e => console.error(e));
