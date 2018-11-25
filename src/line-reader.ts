const LineByLineReader = require('line-by-line');


export class LineReader {
    private lineSource: any
    constructor(private file: string) {
        this.lineSource = new LineByLineReader(this.file);
    }

    async start(cb: (line: string) => Promise<void>) {
        return new Promise((resolve, reject) => {
            this.lineSource.on('line', (line: string) => {
                this.lineSource.pause();
                cb(line).then(() => this.lineSource.resume())
            })
                .on('error', reject)
                .on('end', resolve);
        })
    }
}
