import BatchStream from './lib/BatchStream';
import InsertMixin from './lib/InsertMixin';

class InsertStream extends InsertMixin(BatchStream) {}

export { InsertStream };
