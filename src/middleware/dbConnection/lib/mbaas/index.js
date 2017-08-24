import * as mbaasTypes from './types';

/**
 * Class representing the MBaaS.
 */
class MBaaS {

  constructor(options={}) {
    const mbaas = mbaasTypes[options.mbaasType];
    if (!mbaas) {
      throw new Error('options must have a correct mbaasType');
    }

    this.options = options;
    this.mbaas = mbaas;
  }

  getMongoConf(req) {
    return this.mbaas.getMongoConf(this.options, req);
  }

}

export {MBaaS};
