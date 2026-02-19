// Manual mock for ethers
function fn(returnValue?: any) {
  const mock: any = (...args: any[]) => {
    mock.calls.push(args);
    return mock._returnValue;
  };
  mock.calls = [] as any[];
  mock._returnValue = returnValue;
  mock.mockReturnValue = (v: any) => { mock._returnValue = v; return mock; };
  mock.mockResolvedValue = (v: any) => { mock._returnValue = Promise.resolve(v); return mock; };
  return mock;
}

export const ethers = {
  JsonRpcProvider: function() { return {}; },
  Wallet: function(_key: string, _provider?: any) {
    return {
      address: '0xMockBaseAddress',
      getAddress: () => Promise.resolve('0xMockBaseAddress'),
      sendTransaction: fn(Promise.resolve({ hash: '0xtx', wait: fn() })),
    };
  },
  Contract: function(_addr: string, _abi: any, _signer?: any) {
    return {
      balanceOf: fn(Promise.resolve(BigInt(1000000))),
      decimals: fn(Promise.resolve(6)),
      register: fn(Promise.resolve({ wait: fn(Promise.resolve({ hash: '0xreg' })) })),
      isRegistered: fn(Promise.resolve(false)),
      getIdentity: fn(Promise.resolve(['node', 'http://localhost:3402', '{}'])),
      getAllRegistered: fn(Promise.resolve([])),
      transfer: fn(),
    };
  },
  formatUnits: (_val: any, _dec: any) => '1.0',
  formatEther: (_val: any) => '0.1',
};
