
// SPDX-License-Identifier: AML
//
// Copyright 2017 Christian Reitwiessner
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to
// deal in the Software without restriction, including without limitation the
// rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
// sell copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
// FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
// IN THE SOFTWARE.

// 2019 OKIMS

pragma solidity ^0.8.0;

library Pairing {

    uint256 constant PRIME_Q = 21888242871839275222246405745257275088696311157297823662689037894645226208583;

    struct G1Point {
        uint256 X;
        uint256 Y;
    }

    // Encoding of field elements is: X[0] * z + X[1]
    struct G2Point {
        uint256[2] X;
        uint256[2] Y;
    }

    /*
     * @return The negation of p, i.e. p.plus(p.negate()) should be zero.
     */
    function negate(G1Point memory p) internal pure returns (G1Point memory) {

        // The prime q in the base field F_q for G1
        if (p.X == 0 && p.Y == 0) {
            return G1Point(0, 0);
        } else {
            return G1Point(p.X, PRIME_Q - (p.Y % PRIME_Q));
        }
    }

    /*
     * @return The sum of two points of G1
     */
    function plus(
        G1Point memory p1,
        G1Point memory p2
    ) internal view returns (G1Point memory r) {

        uint256[4] memory input;
        input[0] = p1.X;
        input[1] = p1.Y;
        input[2] = p2.X;
        input[3] = p2.Y;
        bool success;

        // solium-disable-next-line security/no-inline-assembly
        assembly {
            success := staticcall(sub(gas(), 2000), 6, input, 0xc0, r, 0x60)
            // Use "invalid" to make gas estimation work
            switch success case 0 { invalid() }
        }

        require(success,"pairing-add-failed");
    }


    /*
     * Same as plus but accepts raw input instead of struct
     * @return The sum of two points of G1, one is represented as array
     */
    function plus_raw(uint256[4] memory input, G1Point memory r) internal view {
        bool success;

        // solium-disable-next-line security/no-inline-assembly
        assembly {
            success := staticcall(sub(gas(), 2000), 6, input, 0xc0, r, 0x60)
            // Use "invalid" to make gas estimation work
            switch success case 0 {invalid()}
        }

        require(success, "pairing-add-failed");
    }

    /*
     * @return The product of a point on G1 and a scalar, i.e.
     *         p == p.scalar_mul(1) and p.plus(p) == p.scalar_mul(2) for all
     *         points p.
     */
    function scalar_mul(G1Point memory p, uint256 s) internal view returns (G1Point memory r) {

        uint256[3] memory input;
        input[0] = p.X;
        input[1] = p.Y;
        input[2] = s;
        bool success;
        // solium-disable-next-line security/no-inline-assembly
        assembly {
            success := staticcall(sub(gas(), 2000), 7, input, 0x80, r, 0x60)
            // Use "invalid" to make gas estimation work
            switch success case 0 { invalid() }
        }
        require (success,"pairing-mul-failed");
    }


    /*
     * Same as scalar_mul but accepts raw input instead of struct,
     * Which avoid extra allocation. provided input can be allocated outside and re-used multiple times
     */
    function scalar_mul_raw(uint256[3] memory input, G1Point memory r) internal view {
        bool success;

        // solium-disable-next-line security/no-inline-assembly
        assembly {
            success := staticcall(sub(gas(), 2000), 7, input, 0x80, r, 0x60)
            // Use "invalid" to make gas estimation work
            switch success case 0 {invalid()}
        }
        require(success, "pairing-mul-failed");
    }

    /* @return The result of computing the pairing check
     *         e(p1[0], p2[0]) *  .... * e(p1[n], p2[n]) == 1
     *         For example,
     *         pairing([P1(), P1().negate()], [P2(), P2()]) should return true.
     */
    function pairing(
        G1Point memory a1,
        G2Point memory a2,
        G1Point memory b1,
        G2Point memory b2,
        G1Point memory c1,
        G2Point memory c2,
        G1Point memory d1,
        G2Point memory d2
    ) internal view returns (bool) {

        G1Point[4] memory p1 = [a1, b1, c1, d1];
        G2Point[4] memory p2 = [a2, b2, c2, d2];
        uint256 inputSize = 24;
        uint256[] memory input = new uint256[](inputSize);

        for (uint256 i = 0; i < 4; i++) {
            uint256 j = i * 6;
            input[j + 0] = p1[i].X;
            input[j + 1] = p1[i].Y;
            input[j + 2] = p2[i].X[0];
            input[j + 3] = p2[i].X[1];
            input[j + 4] = p2[i].Y[0];
            input[j + 5] = p2[i].Y[1];
        }

        uint256[1] memory out;
        bool success;

        // solium-disable-next-line security/no-inline-assembly
        assembly {
            success := staticcall(sub(gas(), 2000), 8, add(input, 0x20), mul(inputSize, 0x20), out, 0x20)
            // Use "invalid" to make gas estimation work
            switch success case 0 { invalid() }
        }

        require(success,"pairing-opcode-failed");

        return out[0] != 0;
    }
}

contract Verifier {

    using Pairing for *;

    mapping(address => bool) public verifiedIdentities;

    uint256 constant SNARK_SCALAR_FIELD = 21888242871839275222246405745257275088548364400416034343698204186575808495617;
    uint256 constant PRIME_Q = 21888242871839275222246405745257275088696311157297823662689037894645226208583;

    struct VerifyingKey {
        Pairing.G1Point alfa1;
        Pairing.G2Point beta2;
        Pairing.G2Point gamma2;
        Pairing.G2Point delta2;
        // []G1Point IC (K in gnark) appears directly in verifyProof
    }

    struct Proof {
        Pairing.G1Point A;
        Pairing.G2Point B;
        Pairing.G1Point C;
    }

    function verifyingKey() internal pure returns (VerifyingKey memory vk) {
        vk.alfa1 = Pairing.G1Point(uint256(2054092387899803742627395543901888413653228651381667943486878768605299518640), uint256(20778230560558810696184270309798592433322101173585818411433487434494793263824));
        vk.beta2 = Pairing.G2Point([uint256(2818365265528867802027366261334819066612199538778108762213486815512186755245), uint256(9527432387665211055224604571646511174366480346570629072135766064539341799858)], [uint256(3360090446476456308028537585577397915984481076747618630506715438169143960249), uint256(389765598383184067706134104852907963367357228947431818534916880934295037868)]);
        vk.gamma2 = Pairing.G2Point([uint256(4097000240142855180211186233167295268436754749179049297647110393441191926431), uint256(19321492760041581506366435441579568887452392868958743360823945233147431505587)], [uint256(13337330802349500382521916290770210183428920131674075548560681821963816896093), uint256(15986396513171258132668030894947544714587940129091604577168647189215138559837)]);
        vk.delta2 = Pairing.G2Point([uint256(6785560687113676634553991402285840752314636279188654855076693550137447558073), uint256(18061251990596173055604294149705867566472303280810035257763759156644318157813)], [uint256(19860311051493837261047410599756757029002199077290237316652771655729074762479), uint256(20121471093048046326203216497887713682083759833833024991295324189334223061655)]);
    }


    // accumulate scalarMul(mul_input) into q
    // that is computes sets q = (mul_input[0:2] * mul_input[3]) + q
    function accumulate(
        uint256[3] memory mul_input,
        Pairing.G1Point memory p,
        uint256[4] memory buffer,
        Pairing.G1Point memory q
    ) internal view {
        // computes p = mul_input[0:2] * mul_input[3]
        Pairing.scalar_mul_raw(mul_input, p);

        // point addition inputs
        buffer[0] = q.X;
        buffer[1] = q.Y;
        buffer[2] = p.X;
        buffer[3] = p.Y;

        // q = p + q
        Pairing.plus_raw(buffer, q);
    }

    /*
     * @returns Whether the proof is valid given the hardcoded verifying key
     *          above and the public inputs
     */
    function verifyProof(
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c,
        uint256[32] calldata input
    ) public view returns (bool r) {

        Proof memory proof;
        proof.A = Pairing.G1Point(a[0], a[1]);
        proof.B = Pairing.G2Point([b[0][0], b[0][1]], [b[1][0], b[1][1]]);
        proof.C = Pairing.G1Point(c[0], c[1]);

        // Make sure that proof.A, B, and C are each less than the prime q
        require(proof.A.X < PRIME_Q, "verifier-aX-gte-prime-q");
        require(proof.A.Y < PRIME_Q, "verifier-aY-gte-prime-q");

        require(proof.B.X[0] < PRIME_Q, "verifier-bX0-gte-prime-q");
        require(proof.B.Y[0] < PRIME_Q, "verifier-bY0-gte-prime-q");

        require(proof.B.X[1] < PRIME_Q, "verifier-bX1-gte-prime-q");
        require(proof.B.Y[1] < PRIME_Q, "verifier-bY1-gte-prime-q");

        require(proof.C.X < PRIME_Q, "verifier-cX-gte-prime-q");
        require(proof.C.Y < PRIME_Q, "verifier-cY-gte-prime-q");

        // Make sure that every input is less than the snark scalar field
        for (uint256 i = 0; i < input.length; i++) {
            require(input[i] < SNARK_SCALAR_FIELD,"verifier-gte-snark-scalar-field");
        }

        VerifyingKey memory vk = verifyingKey();

        // Compute the linear combination vk_x
        Pairing.G1Point memory vk_x = Pairing.G1Point(0, 0);

        // Buffer reused for addition p1 + p2 to avoid memory allocations
        // [0:2] -> p1.X, p1.Y ; [2:4] -> p2.X, p2.Y
        uint256[4] memory add_input;

        // Buffer reused for multiplication p1 * s
        // [0:2] -> p1.X, p1.Y ; [3] -> s
        uint256[3] memory mul_input;

        // temporary point to avoid extra allocations in accumulate
        Pairing.G1Point memory q = Pairing.G1Point(0, 0);

        vk_x.X = uint256(8752959154007583181787993444879654245918560303580818543094798770097984131796); // vk.K[0].X
        vk_x.Y = uint256(4792758822315177896793660484069486181345516142877716627678737939784268923825); // vk.K[0].Y
        mul_input[0] = uint256(3475528788929620920208557161568411344677550159143296423004895615308148014810); // vk.K[1].X
        mul_input[1] = uint256(3182558249560450177442472345774881299711684683927011088147091209370983647743); // vk.K[1].Y
        mul_input[2] = input[0];
        accumulate(mul_input, q, add_input, vk_x); // vk_x += vk.K[1] * input[0]
        mul_input[0] = uint256(21709001917661957589041390105213718051179465276278404582901314722448583304405); // vk.K[2].X
        mul_input[1] = uint256(16359891173485412775670333414456157378446974065525651325082082517433394769298); // vk.K[2].Y
        mul_input[2] = input[1];
        accumulate(mul_input, q, add_input, vk_x); // vk_x += vk.K[2] * input[1]
        mul_input[0] = uint256(18948105636614409219218490048494024506050636099011523944445303419649496065530); // vk.K[3].X
        mul_input[1] = uint256(2587203380745484345491210950209388167081222392336322635065895475151142029382); // vk.K[3].Y
        mul_input[2] = input[2];
        accumulate(mul_input, q, add_input, vk_x); // vk_x += vk.K[3] * input[2]
        mul_input[0] = uint256(20909867320505712539754888144316619712191019799688389282966102359378738400135); // vk.K[4].X
        mul_input[1] = uint256(11899889399776432360028874271703583341915049032585503380403358730249888488974); // vk.K[4].Y
        mul_input[2] = input[3];
        accumulate(mul_input, q, add_input, vk_x); // vk_x += vk.K[4] * input[3]
        mul_input[0] = uint256(4691607360074779480053407954043254742591927201132329057169730166216993929751); // vk.K[5].X
        mul_input[1] = uint256(18118220487258579807504883259584766960810769041581519851031820205558337395427); // vk.K[5].Y
        mul_input[2] = input[4];
        accumulate(mul_input, q, add_input, vk_x); // vk_x += vk.K[5] * input[4]
        mul_input[0] = uint256(18665575285726973029738365175535840927916575009540553579687264188378886947952); // vk.K[6].X
        mul_input[1] = uint256(1355721091114807920845026171237625874807615530729484637249558227201324516839); // vk.K[6].Y
        mul_input[2] = input[5];
        accumulate(mul_input, q, add_input, vk_x); // vk_x += vk.K[6] * input[5]
        mul_input[0] = uint256(15146766274214344965069767377853285117240271643118257569537796461156284145638); // vk.K[7].X
        mul_input[1] = uint256(12195839120770031768102976738719975140789738491302451139650516996837953014140); // vk.K[7].Y
        mul_input[2] = input[6];
        accumulate(mul_input, q, add_input, vk_x); // vk_x += vk.K[7] * input[6]
        mul_input[0] = uint256(16671306057939253742131835113573648643627390525997841602999538425114718355289); // vk.K[8].X
        mul_input[1] = uint256(21194586218401437811081606261871989459595273123358166829093647961919491589116); // vk.K[8].Y
        mul_input[2] = input[7];
        accumulate(mul_input, q, add_input, vk_x); // vk_x += vk.K[8] * input[7]
        mul_input[0] = uint256(12763040872472128756806757363260785970694948465910829414767600214761233718639); // vk.K[9].X
        mul_input[1] = uint256(18213240046835238359935978412370273878412296323759745010248408599867711522072); // vk.K[9].Y
        mul_input[2] = input[8];
        accumulate(mul_input, q, add_input, vk_x); // vk_x += vk.K[9] * input[8]
        mul_input[0] = uint256(15281636529120960874953207831964766552701904234914127198015899303653075349142); // vk.K[10].X
        mul_input[1] = uint256(9042493327730971798146896935042061696686556385852453679962631137154045989005); // vk.K[10].Y
        mul_input[2] = input[9];
        accumulate(mul_input, q, add_input, vk_x); // vk_x += vk.K[10] * input[9]
        mul_input[0] = uint256(21366762010392234083321690576750395181107720865858778139640759193209345581403); // vk.K[11].X
        mul_input[1] = uint256(8544284690543268690398692138156076959315344683837662808674668138951046268345); // vk.K[11].Y
        mul_input[2] = input[10];
        accumulate(mul_input, q, add_input, vk_x); // vk_x += vk.K[11] * input[10]
        mul_input[0] = uint256(5516664726391575738730927321394836226461846113563198840780399474568222266754); // vk.K[12].X
        mul_input[1] = uint256(15764698477322685153748336727402140084203282853454375061193583780963277906436); // vk.K[12].Y
        mul_input[2] = input[11];
        accumulate(mul_input, q, add_input, vk_x); // vk_x += vk.K[12] * input[11]
        mul_input[0] = uint256(14740710940255485437950536562655208804681369615007028360946630890236063994485); // vk.K[13].X
        mul_input[1] = uint256(2526993962131648861774648493913941020299300425379594391472602684131529254722); // vk.K[13].Y
        mul_input[2] = input[12];
        accumulate(mul_input, q, add_input, vk_x); // vk_x += vk.K[13] * input[12]
        mul_input[0] = uint256(11089387770575817839829581969575444656395865430753575227571544484517624269013); // vk.K[14].X
        mul_input[1] = uint256(17236590262973823889772057370300770393259736737460102522582458776838492715920); // vk.K[14].Y
        mul_input[2] = input[13];
        accumulate(mul_input, q, add_input, vk_x); // vk_x += vk.K[14] * input[13]
        mul_input[0] = uint256(17972246363618863109550615688106776017309603274043150308551844494991052589334); // vk.K[15].X
        mul_input[1] = uint256(14786257510791478366603277294162773333360881439168182018625760305699846868375); // vk.K[15].Y
        mul_input[2] = input[14];
        accumulate(mul_input, q, add_input, vk_x); // vk_x += vk.K[15] * input[14]
        mul_input[0] = uint256(8121548650673427256157026858166496314283384366415882485362142820664053068949); // vk.K[16].X
        mul_input[1] = uint256(8755192192194306307363742851777561703298938844067759453921196824160316519967); // vk.K[16].Y
        mul_input[2] = input[15];
        accumulate(mul_input, q, add_input, vk_x); // vk_x += vk.K[16] * input[15]
        mul_input[0] = uint256(1161300943855944435678338898863911741473051536216158452960354579343882622376); // vk.K[17].X
        mul_input[1] = uint256(4904549004840751795167114370698499179197302079145428760300019579811001615229); // vk.K[17].Y
        mul_input[2] = input[16];
        accumulate(mul_input, q, add_input, vk_x); // vk_x += vk.K[17] * input[16]
        mul_input[0] = uint256(3192496164094492339066185549434852393889673838055358838522438218589006847985); // vk.K[18].X
        mul_input[1] = uint256(8540205416932619373641060297625996140325087951703723060092528331642640485533); // vk.K[18].Y
        mul_input[2] = input[17];
        accumulate(mul_input, q, add_input, vk_x); // vk_x += vk.K[18] * input[17]
        mul_input[0] = uint256(7214851280717655220495945449006120840094523357322095851402263014661188774088); // vk.K[19].X
        mul_input[1] = uint256(8271726472155431076845138171286150420749198904101049593012400568218178943256); // vk.K[19].Y
        mul_input[2] = input[18];
        accumulate(mul_input, q, add_input, vk_x); // vk_x += vk.K[19] * input[18]
        mul_input[0] = uint256(2444987366866715410029857957600535470743300852691495646128866644529289205462); // vk.K[20].X
        mul_input[1] = uint256(11328886398003608835728987327402530769059495220034214066631871956082782137684); // vk.K[20].Y
        mul_input[2] = input[19];
        accumulate(mul_input, q, add_input, vk_x); // vk_x += vk.K[20] * input[19]
        mul_input[0] = uint256(19349225247487692057780347465124887096044856745847513911262174869193253813144); // vk.K[21].X
        mul_input[1] = uint256(11574714382752745140443632608713670373614790440907954820941679057233098140353); // vk.K[21].Y
        mul_input[2] = input[20];
        accumulate(mul_input, q, add_input, vk_x); // vk_x += vk.K[21] * input[20]
        mul_input[0] = uint256(10965313623385368968090410357043406957371301659084119358925965112106620920602); // vk.K[22].X
        mul_input[1] = uint256(17483827606091921024375204313838803033322547868397057040973268935623304001352); // vk.K[22].Y
        mul_input[2] = input[21];
        accumulate(mul_input, q, add_input, vk_x); // vk_x += vk.K[22] * input[21]
        mul_input[0] = uint256(9087713972996047722779378473091218574676548455580477281076921451006631300113); // vk.K[23].X
        mul_input[1] = uint256(11902138187257164853793344614152143404555355474848312799986607145798927183995); // vk.K[23].Y
        mul_input[2] = input[22];
        accumulate(mul_input, q, add_input, vk_x); // vk_x += vk.K[23] * input[22]
        mul_input[0] = uint256(18584803006447504053869294857612414119608242036905366066473506594774149149698); // vk.K[24].X
        mul_input[1] = uint256(8406064486953882930900125251010737872074287807986153649765037645163312197992); // vk.K[24].Y
        mul_input[2] = input[23];
        accumulate(mul_input, q, add_input, vk_x); // vk_x += vk.K[24] * input[23]
        mul_input[0] = uint256(6274310413386948613277440704538508116878190127105630927553417420120693260457); // vk.K[25].X
        mul_input[1] = uint256(15851666214084428816520188316162699931829535607763178265337158462324092912158); // vk.K[25].Y
        mul_input[2] = input[24];
        accumulate(mul_input, q, add_input, vk_x); // vk_x += vk.K[25] * input[24]
        mul_input[0] = uint256(2824754421458292338050444226363766604371018840844276795352979841790919135880); // vk.K[26].X
        mul_input[1] = uint256(15258350696345651178618946526634826222999611401753327042530633391819870052594); // vk.K[26].Y
        mul_input[2] = input[25];
        accumulate(mul_input, q, add_input, vk_x); // vk_x += vk.K[26] * input[25]
        mul_input[0] = uint256(6219400768704103580956775162610623106599532237050829824350816511803661429628); // vk.K[27].X
        mul_input[1] = uint256(7159715151611223111886600797873932065054846181292680076065382431357563968307); // vk.K[27].Y
        mul_input[2] = input[26];
        accumulate(mul_input, q, add_input, vk_x); // vk_x += vk.K[27] * input[26]
        mul_input[0] = uint256(19231512071799465038530772161160950378766873548383829692706177875585019269609); // vk.K[28].X
        mul_input[1] = uint256(12410417657916768729126975453477908982449705249310387713760208927533165681591); // vk.K[28].Y
        mul_input[2] = input[27];
        accumulate(mul_input, q, add_input, vk_x); // vk_x += vk.K[28] * input[27]
        mul_input[0] = uint256(14416549560405859395447203740473069402490499473600236134365928643031243288124); // vk.K[29].X
        mul_input[1] = uint256(11666476300526445484840289480766945075177202323718609741368668410852109723530); // vk.K[29].Y
        mul_input[2] = input[28];
        accumulate(mul_input, q, add_input, vk_x); // vk_x += vk.K[29] * input[28]
        mul_input[0] = uint256(19210123382556906907968212695881411481725466846379245901598043447420726391200); // vk.K[30].X
        mul_input[1] = uint256(15974332232763145357617368748987296965038232897973603166930536235014881339286); // vk.K[30].Y
        mul_input[2] = input[29];
        accumulate(mul_input, q, add_input, vk_x); // vk_x += vk.K[30] * input[29]
        mul_input[0] = uint256(15456929106025017378438282791369468977483763094738867410057834728168359368869); // vk.K[31].X
        mul_input[1] = uint256(5396102809797589764955622205475257518702791825500077435957824505687538044182); // vk.K[31].Y
        mul_input[2] = input[30];
        accumulate(mul_input, q, add_input, vk_x); // vk_x += vk.K[31] * input[30]
        mul_input[0] = uint256(20332094002582413504306310339263080950872130404384195509202787345186845419751); // vk.K[32].X
        mul_input[1] = uint256(9169282447839191215589036147980748128871077942956645152744372437083877492454); // vk.K[32].Y
        mul_input[2] = input[31];
        accumulate(mul_input, q, add_input, vk_x); // vk_x += vk.K[32] * input[31]

        return Pairing.pairing(
            Pairing.negate(proof.A),
            proof.B,
            vk.alfa1,
            vk.beta2,
            vk_x,
            vk.gamma2,
            proof.C,
            vk.delta2
        );
    }

    function identityVerification(
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c,
        uint256[32] calldata input
    ) public {
        require(verifyProof(a, b, c, input), "proof failed");
        verifiedIdentities[msg.sender] = true;
    }

    function isVerified(
        address acc
    ) public view returns (bool r) {
        return verifiedIdentities[acc];
    }
}
