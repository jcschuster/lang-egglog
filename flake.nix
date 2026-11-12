{
  description = "lang-egglog: CodeMirror language support for egglog";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    # The egglog release that packages/codemirror-lang-egglog/package.json names under
    # "egglog".
    egglog = {
      url = "github:egraphs-good/egglog/v3.0.0";
      flake = false;
    };
  };

  outputs =
    { nixpkgs, egglog, ... }:
    let
      systems = [ "x86_64-linux" "aarch64-linux" ];
      forAll = f: nixpkgs.lib.genAttrs systems (s: f nixpkgs.legacyPackages.${s});
    in
    {
      devShells = forAll (pkgs: {
        default = pkgs.mkShell {
          packages = [
            pkgs.nodejs_26
            pkgs.pnpm
            pkgs.jq # .github/scripts
            (pkgs.rustPlatform.buildRustPackage {
              pname = "egglog";
              version = "3.0.0";
              src = egglog;
              cargoLock.lockFile = "${egglog}/Cargo.lock";
              cargoBuildFlags = [ "--bin" "egglog" ];
              doCheck = false;
            })
          ];
        };
      });
    };
}
