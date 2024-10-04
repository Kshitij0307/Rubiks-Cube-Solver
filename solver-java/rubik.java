import java.util.*;
public class rubik {
    static class CubeState{
        String[][] cube;
        int moves;

        CubeState(String[][] c,int m){
            cube = c;
            moves = m;
        }
    }
    //    public static String[][] cube = new String[6][9];
    public static String[][] initializeSolvedCube(){
        String[][] cube = new String[6][9];
        // Faces = White , Red , Green , Orange , Blue , Yellow ;
        String[] colors = {"W","R","G","O","B","Y"};
        for(int i=0;i<6;i++){
            for(int j=0;j<9;j++){
                cube[i][j] = colors[i];
            }
        }
        return cube;
    }
    public static void printCube(String[][] cube){
        for(int i=0;i<6;i++){
            System.out.println(Arrays.toString(cube[i]));
        }
    }
    public static void rotateFaceClockWise(String[][] cube,int face) {
        String[] temp = new String[9];
        System.arraycopy(cube[face], 0, temp, 0, 9);
        cube[face][0] = temp[6];
        cube[face][1] = temp[3];
        cube[face][2] = temp[0];
        cube[face][3] = temp[7];
        cube[face][4] = temp[4];
        cube[face][5] = temp[1];
        cube[face][6] = temp[8];
        cube[face][7] = temp[5];
        cube[face][8] = temp[2];
    }
    public static void rotateFaceAntiClockWise(String[][] cube,int face) {
        String[] temp = new String[9];
        System.arraycopy(cube[face], 0, temp, 0, 9);
        cube[face][0] = temp[2];
        cube[face][1] = temp[5];
        cube[face][2] = temp[8];
        cube[face][3] = temp[1];
        cube[face][4] = temp[4];
        cube[face][5] = temp[7];
        cube[face][6] = temp[0];
        cube[face][7] = temp[3];
        cube[face][8] = temp[6];
    }
    public static String[][] U(String[][] cube){
        rotateFaceClockWise(cube,0);

        String temp[] = new String[3];
        for(int j=0;j<3;j++){
            temp[j] = cube[1][j];
        }
        for(int i=1;i<4;i++){
            for(int j=0;j<3;j++){
                cube[i][j] = cube[i+1][j];
            }
        }
        for(int j=0;j<3;j++){
            cube[4][j] = temp[j];
        }
        return cube;
    }
    public static String[][] UPrime(String[][] cube){
        rotateFaceAntiClockWise(cube,0);

        String temp[] = new String[3];
        for(int j=0;j<3;j++){
            temp[j] = cube[4][j];
        }
        for(int i=4;i>1;i--){
            for(int j=0;j<3;j++){
                cube[i][j] = cube[i-1][j];
            }
        }
        for(int j=0;j<3;j++){
            cube[1][j] = temp[j];
        }
        return cube;
    }

    public static String[][] D(String[][] cube){
        rotateFaceClockWise(cube,5);

        String temp[] = new String[3];
        for(int j=6;j<9;j++){
            temp[j%3] = cube[4][j];
        }
        for(int i=4;i>1;i--){
            for(int j=6;j<9;j++){
                cube[i][j] = cube[i-1][j];
            }
        }
        for(int j=6;j<9;j++) {
            cube[1][j] = temp[j % 3];
        }

        return cube;
    }

    public static String[][] DPrime(String[][] cube){
        rotateFaceAntiClockWise(cube,5);

        String temp[] = new String[3];
        for(int j=6;j<9;j++){
            temp[j%3] = cube[1][j];
        }
        for(int i=1;i<4;i++){
            for(int j=6;j<9;j++){
                cube[i][j] = cube[i+1][j];
            }
        }
        for(int j=6;j<9;j++){
            cube[4][j] = temp[j%3];
        }

        return cube;
    }

    public static String[][] F(String[][] cube) {
        rotateFaceClockWise(cube,1);

        String temp[] = new String[3];
        for(int j=6;j<9;j++){
            temp[j%3] = cube[0][j];
        }
        cube[0][6] = cube[4][8];
        cube[0][7] = cube[4][5];
        cube[0][8] = cube[4][2];

        cube[4][2] = cube[5][0];
        cube[4][5] = cube[5][1];
        cube[4][8] = cube[5][2];

        cube[5][0] = cube[2][6];
        cube[5][1] = cube[2][3];
        cube[5][2] = cube[2][0];

        cube[2][0] = temp[0];
        cube[2][3] = temp[1];
        cube[2][6] = temp[2];

        return cube;

    }

    public static String[][] FPrime(String[][] cube){
        rotateFaceAntiClockWise(cube,1);

        String temp[] = new String[3];
        for(int j=6;j<9;j++){
            temp[j%3] = cube[0][j];
        }
        cube[0][6] = cube[2][0];
        cube[0][7] = cube[2][3];
        cube[0][8] = cube[2][6];

        cube[2][0] = cube[5][2];
        cube[2][3] = cube[5][1];
        cube[2][6] = cube[5][0];

        cube[5][0] = cube[4][2];
        cube[5][1] = cube[4][5];
        cube[5][2] = cube[4][8];

        cube[4][2] = temp[2];
        cube[4][5] = temp[1];
        cube[4][8] = temp[0];

        return cube;

    }

    public static String[][] B(String[][] cube){
        rotateFaceClockWise(cube,3);

        String temp[] = new String[3];
        for(int j=0;j<3;j++){
            temp[j%3] = cube[0][j];
        }

        cube[0][0] = cube[2][2];
        cube[0][1] = cube[2][5];
        cube[0][2] = cube[2][8];

        cube[2][2] = cube[5][8];
        cube[2][5] = cube[5][7];
        cube[2][8] = cube[5][6];

        cube[5][6] = cube[4][0];
        cube[5][7] = cube[4][3];
        cube[5][8] = cube[4][6];

        cube[4][0] = temp[2];
        cube[4][3] = temp[1];
        cube[4][6] = temp[0];

        return cube;

    }

    public static String[][] BPrime(String[][] cube) {
        rotateFaceAntiClockWise(cube,3);

        String temp[] = new String[3];
        for (int j = 0; j < 3; j++) {
            temp[j % 3] = cube[0][j];
        }

        cube[0][0] = cube[4][6];
        cube[0][1] = cube[4][3];
        cube[0][2] = cube[4][0];

        cube[4][0] = cube[5][6];
        cube[4][3] = cube[5][7];
        cube[4][6] = cube[5][8];

        cube[5][6] = cube[2][8];
        cube[5][7] = cube[2][5];
        cube[5][8] = cube[2][2];

        cube[2][2] = temp[0];
        cube[2][5] = temp[1];
        cube[2][8] = temp[2];

        return cube;
    }
    public static String[][] R(String[][] cube) {
        rotateFaceClockWise(cube,2);

        String temp[] = new String[3];
        temp[0] = cube[0][2];
        temp[1] = cube[0][5];
        temp[2] = cube[0][8];

        cube[0][2] = cube[1][2];
        cube[0][5] = cube[1][5];
        cube[0][8] = cube[1][8];

        cube[1][2] = cube[5][2];
        cube[1][5] = cube[5][5];
        cube[1][8] = cube[5][8];

        cube[5][2] = cube[3][6];
        cube[5][5] = cube[3][3];
        cube[5][8] = cube[3][0];

        cube[3][0] = temp[2];
        cube[3][3] = temp[1];
        cube[3][6] = temp[0];

        return cube;
    }
    public static String[][] RPrime(String[][] cube) {
        rotateFaceAntiClockWise(cube,2);

        String temp[] = new String[3];
        temp[0] = cube[0][2];
        temp[1] = cube[0][5];
        temp[2] = cube[0][8];

        cube[0][2] = cube[3][6];
        cube[0][5] = cube[3][3];
        cube[0][8] = cube[3][0];

        cube[3][0] = cube[5][8];
        cube[3][3] = cube[5][5];
        cube[3][6] = cube[5][2];

        cube[5][2] = cube[1][2];
        cube[5][5] = cube[1][5];
        cube[5][8] = cube[1][8];

        cube[1][2] = temp[0];
        cube[1][5] = temp[1];
        cube[1][8] = temp[2];

        return cube;
    }
    public static String[][] L(String[][] cube) {
        rotateFaceClockWise(cube,4);

        String temp[] = new String[3];
        temp[0] = cube[0][0];
        temp[1] = cube[0][3];
        temp[2] = cube[0][6];

        cube[0][0] = cube[3][8];
        cube[0][3] = cube[3][5];
        cube[0][6] = cube[3][2];

        cube[3][2] = cube[5][6];
        cube[3][5] = cube[5][3];
        cube[3][8] = cube[5][0];

        cube[5][0] = cube[1][0];
        cube[5][3] = cube[1][3];
        cube[5][6] = cube[1][6];

        cube[1][0] = temp[0];
        cube[1][3] = temp[1];
        cube[1][6] = temp[2];

        return cube;
    }
    public static String[][] LPrime(String[][] cube) {
        rotateFaceAntiClockWise(cube,4);

        String temp[] = new String[3];
        temp[0] = cube[0][0];
        temp[1] = cube[0][3];
        temp[2] = cube[0][6];

        cube[0][0] = cube[1][0];
        cube[0][3] = cube[1][3];
        cube[0][6] = cube[1][6];

        cube[1][0] = cube[5][0];
        cube[1][3] = cube[5][3];
        cube[1][6] = cube[5][6];

        cube[5][0] = cube[3][8];
        cube[5][3] = cube[3][5];
        cube[5][6] = cube[3][2];

        cube[3][2] = temp[2];
        cube[3][5] = temp[1];
        cube[3][8] = temp[0];

        return cube;
    }

    public static String[][] performMove(String[][] cube,int n){
        switch(n){
            case 1:
                return U(cube);
            case 2:
                return UPrime(cube);
            case 3:
                return D(cube);
            case 4:
                return DPrime(cube);
            case 5:
                return F(cube);
            case 6:
                return FPrime(cube);
            case 7:
                return B(cube);
            case 8:
                return BPrime(cube);
            case 9:
                return R(cube);
            case 10:
                return RPrime(cube);
            case 11:
                return L(cube);
            case 12:
                return LPrime(cube);
        }
        return new String[0][];
    }
    public static String convertCubeToString(String[][] cube) {
        StringBuilder sb = new StringBuilder();
        for (String[] face : cube) {
            for (String sticker : face) {
                sb.append(sticker);
            }
        }
        return sb.toString();
    }
    public static String[][] deepCopyCube(String[][] cube) {
        String[][] copy = new String[cube.length][];
        for (int i = 0; i < cube.length; i++) {
            copy[i] = Arrays.copyOf(cube[i], cube[i].length);
        }
        return copy;
    }

    public static void solveCube(String[][] cube){
        String[][] solvedState = initializeSolvedCube();

        HashSet<String> vis = new HashSet<>();
        Queue<CubeState> q = new LinkedList<>();
        q.add(new CubeState(deepCopyCube(cube), 0));

        while(!q.isEmpty()){
            CubeState curState = q.poll();

            if(Arrays.deepEquals(cube, solvedState)){
                System.out.println("Cube Solved with total moves =" + curState.moves);
                return;
            }

            String cubeString = convertCubeToString(curState.cube);
            if (!vis.contains(cubeString)) {
                vis.add(cubeString);
                for (int i = 1; i <= 12; i++) {
                    String[][] newState = deepCopyCube(curState.cube);
                    newState = performMove(newState, i);
                    q.add(new CubeState(newState, curState.moves + 1));
                }
            }
        }

    }

    public static void main(String[] args) {
//        initializeCube();
        String[][] cube = {
                {"G", "O", "O", "G", "W", "B", "Y", "G", "R"},  // GOOGWBYGR
                {"G", "W", "Y", "G", "R", "Y", "O", "R", "Y"},  // GWYGRYORY
                {"G", "W", "B", "O", "G", "R", "B", "G", "B"},  // GWBOGRBGB
                {"W", "B", "W", "B", "O", "O", "W", "B", "O"},  // WBWBOOWBO
                {"R", "O", "O", "W", "B", "Y", "G", "R", "Y"},  // ROOWBYGRY
                {"B", "W", "R", "Y", "Y", "R", "W", "Y", "R"}   // BWRYYRWYR
        };

        solveCube(cube);


//        printCube();
    }
}